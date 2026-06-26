import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

export async function createRoom(roomName) {
    console.log(`🏠 Room created: ${roomName}`);
    return roomName;
}

export async function generateToken(roomName, participantName) {
    const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        {
            identity: participantName,
            ttl: '2h'
        }
    );

    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
    });

    const jwt = await token.toJwt();
    console.log(`🎫 Token generated for ${participantName} in room ${roomName}`);
    return jwt;
}