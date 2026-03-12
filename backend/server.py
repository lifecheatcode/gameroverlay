from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== Models ==============

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class GameAnalysisRequest(BaseModel):
    image_base64: str
    game_type: Optional[str] = "general"
    context: Optional[str] = ""

class GameAnalysisResponse(BaseModel):
    id: str
    tips: List[str]
    strategy: str
    game_detected: str
    confidence: float
    timestamp: str

class ChatMessage(BaseModel):
    role: str  # user or assistant
    content: str
    timestamp: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    image_base64: Optional[str] = None
    game_context: Optional[str] = ""

class ChatResponse(BaseModel):
    session_id: str
    response: str
    timestamp: str

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "nova"
    speed: Optional[float] = 1.0

class GameSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    game_type: str = "general"
    started_at: str
    last_active: str
    analysis_count: int = 0
    tips_given: List[str] = []

class SessionCreate(BaseModel):
    game_type: Optional[str] = "general"
    user_id: Optional[str] = None


# ============== Routes ==============

@api_router.get("/")
async def root():
    return {"message": "Game Insight HUD API - Ready"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ============== Game Analysis ==============

@api_router.post("/analyze", response_model=GameAnalysisResponse)
async def analyze_game_screen(request: GameAnalysisRequest):
    """Analyze a game screenshot and provide tips using GPT-5.2 vision"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        # Create chat instance for analysis
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analyze-{uuid.uuid4()}",
            system_message="""You are an expert gaming analyst AI. Your role is to analyze game screenshots and provide actionable tips to help players win.

For each screenshot, you should:
1. Identify the game or game type being played
2. Analyze the current game state
3. Provide 3-5 specific, actionable tips
4. Suggest an overall strategy

Be concise but specific. Focus on immediate actions the player can take.
Respond in JSON format with keys: game_detected, confidence (0-1), tips (array), strategy (string)"""
        ).with_model("openai", "gpt-5.2")
        
        # Create image content
        image_content = ImageContent(image_base64=request.image_base64)
        
        prompt = f"Analyze this game screenshot"
        if request.game_type and request.game_type != "general":
            prompt += f" (Game type: {request.game_type})"
        if request.context:
            prompt += f". Context: {request.context}"
        prompt += ". Respond with JSON only."
        
        user_message = UserMessage(
            text=prompt,
            image_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the response
        import json
        try:
            # Try to extract JSON from the response
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            analysis = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback parsing
            analysis = {
                "game_detected": "Unknown",
                "confidence": 0.5,
                "tips": [response[:200] if len(response) > 200 else response],
                "strategy": "Continue playing and observe patterns."
            }
        
        result = GameAnalysisResponse(
            id=str(uuid.uuid4()),
            tips=analysis.get("tips", ["Keep playing!"]),
            strategy=analysis.get("strategy", "Focus on the objective"),
            game_detected=analysis.get("game_detected", "Unknown"),
            confidence=analysis.get("confidence", 0.5),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
        # Store analysis in DB
        await db.analyses.insert_one({
            "id": result.id,
            "game_type": request.game_type,
            "game_detected": result.game_detected,
            "tips": result.tips,
            "strategy": result.strategy,
            "timestamp": result.timestamp
        })
        
        return result
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ============== Chat Q&A ==============

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Chat with AI about the current game state"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        # Get chat history from DB
        history = await db.chat_history.find(
            {"session_id": request.session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(50)
        
        # Build context from history
        history_context = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in history[-10:]  # Last 10 messages
        ])
        
        system_message = f"""You are a helpful gaming assistant AI. You help players with game strategies, tips, and answers to their gaming questions.

Previous conversation:
{history_context}

Game context: {request.game_context if request.game_context else 'General gaming assistance'}

Be concise, helpful, and focus on actionable advice."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=request.session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        # Build user message
        if request.image_base64:
            image_content = ImageContent(image_base64=request.image_base64)
            user_message = UserMessage(
                text=request.message,
                image_contents=[image_content]
            )
        else:
            user_message = UserMessage(text=request.message)
        
        response = await chat.send_message(user_message)
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Save user message to history
        await db.chat_history.insert_one({
            "session_id": request.session_id,
            "role": "user",
            "content": request.message,
            "timestamp": timestamp
        })
        
        # Save assistant response to history
        await db.chat_history.insert_one({
            "session_id": request.session_id,
            "role": "assistant",
            "content": response,
            "timestamp": timestamp
        })
        
        return ChatResponse(
            session_id=request.session_id,
            response=response,
            timestamp=timestamp
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@api_router.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    history = await db.chat_history.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return {"session_id": session_id, "messages": history}


@api_router.delete("/chat/{session_id}/clear")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session"""
    await db.chat_history.delete_many({"session_id": session_id})
    return {"message": "Chat history cleared", "session_id": session_id}


# ============== Text-to-Speech ==============

@api_router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using OpenAI TTS"""
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="TTS API key not configured")
        
        tts = OpenAITextToSpeech(api_key=api_key)
        
        audio_bytes = await tts.generate_speech(
            text=request.text,
            model="tts-1",
            voice=request.voice,
            speed=request.speed,
            response_format="mp3"
        )
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=tip.mp3"}
        )
        
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@api_router.post("/tts/base64")
async def text_to_speech_base64(request: TTSRequest):
    """Convert text to speech and return as base64"""
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="TTS API key not configured")
        
        tts = OpenAITextToSpeech(api_key=api_key)
        
        audio_base64 = await tts.generate_speech_base64(
            text=request.text,
            model="tts-1",
            voice=request.voice,
            speed=request.speed
        )
        
        return {"audio_base64": audio_base64, "format": "mp3"}
        
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


# ============== Session Management ==============

@api_router.post("/sessions", response_model=GameSession)
async def create_session(request: SessionCreate):
    """Create a new gaming session"""
    now = datetime.now(timezone.utc).isoformat()
    session = GameSession(
        game_type=request.game_type or "general",
        user_id=request.user_id,
        started_at=now,
        last_active=now
    )
    
    await db.sessions.insert_one(session.model_dump())
    return session


@api_router.get("/sessions/{session_id}", response_model=GameSession)
async def get_session(session_id: str):
    """Get session details"""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return GameSession(**session)


@api_router.put("/sessions/{session_id}/active")
async def update_session_activity(session_id: str):
    """Update session last active timestamp"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"last_active": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session updated", "last_active": now}


@api_router.get("/sessions")
async def list_sessions(limit: int = 20):
    """List recent sessions"""
    sessions = await db.sessions.find(
        {},
        {"_id": 0}
    ).sort("last_active", -1).to_list(limit)
    return {"sessions": sessions}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
