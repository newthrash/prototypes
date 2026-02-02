"""
ScreenLink - Modern Screen Sharing Tool
FastAPI backend with Socket.io for WebRTC signaling
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
import socketio
import random
import string
from typing import Dict, Set
from datetime import datetime

# Create FastAPI app
app = FastAPI(title="ScreenLink", description="Modern Screen Sharing Tool")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

# Create ASGI app combining FastAPI and Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# In-memory storage for rooms
# Structure: {room_code: {"host": sid, "peers": set(), "created_at": datetime}}
rooms: Dict[str, Dict] = {}

# Track which room each socket is in
socket_rooms: Dict[str, str] = {}

def generate_room_code() -> str:
    """Generate a random 6-digit room code."""
    while True:
        code = ''.join(random.choices(string.digits, k=6))
        if code not in rooms:
            return code

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Home page with room creation/joining."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/room/{room_code}", response_class=HTMLResponse)
async def room(request: Request, room_code: str):
    """Room page for screen sharing."""
    if room_code not in rooms:
        return RedirectResponse(url="/?error=room_not_found")
    return templates.TemplateResponse("room.html", {
        "request": request, 
        "room_code": room_code
    })

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    """Handle new socket connection."""
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    """Handle socket disconnection."""
    print(f"Client disconnected: {sid}")
    
    # Clean up room membership
    if sid in socket_rooms:
        room_code = socket_rooms[sid]
        if room_code in rooms:
            room = rooms[room_code]
            
            # If host disconnects, close the room
            if room.get("host") == sid:
                # Notify all peers
                for peer_sid in room.get("peers", set()):
                    await sio.emit("host-disconnected", room=peer_sid)
                del rooms[room_code]
            else:
                # Remove peer from room
                room["peers"].discard(sid)
                # Notify host
                if room.get("host"):
                    await sio.emit("peer-disconnected", {"peer_id": sid}, room=room["host"])
        
        del socket_rooms[sid]

@sio.event
async def create_room(sid):
    """Create a new room and return the room code."""
    room_code = generate_room_code()
    
    rooms[room_code] = {
        "host": sid,
        "peers": set(),
        "created_at": datetime.now()
    }
    
    socket_rooms[sid] = room_code
    
    await sio.emit("room-created", {"room_code": room_code}, room=sid)
    print(f"Room created: {room_code} by {sid}")

@sio.event
async def join_room(sid, data):
    """Join an existing room."""
    room_code = data.get("room_code")
    
    if not room_code or room_code not in rooms:
        await sio.emit("error", {"message": "Room not found"}, room=sid)
        return
    
    room = rooms[room_code]
    
    # Prevent host from joining as peer
    if room["host"] == sid:
        await sio.emit("error", {"message": "You are the host"}, room=sid)
        return
    
    # Add peer to room
    room["peers"].add(sid)
    socket_rooms[sid] = room_code
    
    # Notify host that a peer joined
    await sio.emit("peer-joined", {"peer_id": sid}, room=room["host"])
    
    # Confirm to peer
    await sio.emit("room-joined", {"room_code": room_code}, room=sid)
    
    print(f"Peer {sid} joined room {room_code}")

@sio.event
async def leave_room(sid, data):
    """Leave a room."""
    room_code = data.get("room_code")
    
    if room_code and room_code in rooms:
        room = rooms[room_code]
        
        if room.get("host") == sid:
            # Host leaving - close room
            for peer_sid in room.get("peers", set()):
                await sio.emit("host-disconnected", room=peer_sid)
            del rooms[room_code]
        else:
            # Peer leaving
            room["peers"].discard(sid)
            if room.get("host"):
                await sio.emit("peer-disconnected", {"peer_id": sid}, room=room["host"])
    
    if sid in socket_rooms:
        del socket_rooms[sid]

# WebRTC Signaling Events
@sio.event
async def offer(sid, data):
    """Forward WebRTC offer to target peer."""
    target_id = data.get("target_id")
    offer = data.get("offer")
    
    if target_id:
        await sio.emit("offer", {"offer": offer, "sender_id": sid}, room=target_id)

@sio.event
async def answer(sid, data):
    """Forward WebRTC answer to target peer."""
    target_id = data.get("target_id")
    answer = data.get("answer")
    
    if target_id:
        await sio.emit("answer", {"answer": answer, "sender_id": sid}, room=target_id)

@sio.event
async def ice_candidate(sid, data):
    """Forward ICE candidate to target peer."""
    target_id = data.get("target_id")
    candidate = data.get("candidate")
    
    if target_id:
        await sio.emit("ice-candidate", {"candidate": candidate, "sender_id": sid}, room=target_id)

@sio.event
async def request_screen_share(sid, data):
    """Request host to start screen sharing."""
    room_code = data.get("room_code")
    
    if room_code and room_code in rooms:
        room = rooms[room_code]
        if room.get("host"):
            await sio.emit("start-screen-share", {"requester_id": sid}, room=room["host"])

@sio.event
async def screen_share_started(sid, data):
    """Notify peers that screen sharing has started."""
    room_code = data.get("room_code")
    
    if room_code and room_code in rooms:
        room = rooms[room_code]
        for peer_sid in room.get("peers", set()):
            await sio.emit("screen-share-started", room=peer_sid)

@sio.event
async def screen_share_stopped(sid, data):
    """Notify peers that screen sharing has stopped."""
    room_code = data.get("room_code")
    
    if room_code and room_code in rooms:
        room = rooms[room_code]
        for peer_sid in room.get("peers", set()):
            await sio.emit("screen-share-stopped", room=peer_sid)

# Chat events
@sio.event
async def chat_message(sid, data):
    """Broadcast chat message to room."""
    room_code = data.get("room_code")
    message = data.get("message")
    sender = data.get("sender", "Anonymous")
    
    if room_code and room_code in rooms:
        room = rooms[room_code]
        
        # Send to host
        if room.get("host") and room["host"] != sid:
            await sio.emit("chat-message", {
                "sender": sender,
                "message": message,
                "timestamp": datetime.now().isoformat()
            }, room=room["host"])
        
        # Send to all peers except sender
        for peer_sid in room.get("peers", set()):
            if peer_sid != sid:
                await sio.emit("chat-message", {
                    "sender": sender,
                    "message": message,
                    "timestamp": datetime.now().isoformat()
                }, room=peer_sid)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
