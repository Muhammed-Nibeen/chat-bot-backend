import { Server as httpServer } from "http";
import { Server as SocketIOServer} from "socket.io"
import { Message } from "../model/message";
import mongoose, { Types } from 'mongoose';
import { userCollection } from "../model/userSchema";

interface User {
  userId: String;
  role: string
}

export function configureSocket(expressServer: httpServer){
  const io = new SocketIOServer(expressServer,{
    cors:{
      origin: "http://localhost:4200",
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    }
  })

  const rooms: Record<string, User[]> = {};
  

  io.on("connection",(socket)=>{
    console.log("New client connected", socket.id);
  
  // Join a room
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

    // Handle sendMessage
  socket.on('sendMessage', async (data: { senderId: string, receiverId: string, message: string, roomId: string }) => {
    const { senderId, receiverId, message, roomId } = data;
    
    const senderIdObj = new mongoose.Types.ObjectId(senderId);
    const user = await userCollection.findById(senderIdObj).select('fullName');
    const senderName = user ? user.fullName : null;

    const newMessage = new Message({ senderId, receiverId, message, roomId, senderName});
    console.log('message received: ', newMessage);
    console.log('sender:', senderId)
    console.log('reciver: ', receiverId)
    console.log('roomId: ', roomId)
    console.log('roomId: ', senderName)
    await Message.create(newMessage);

  // Emit message to the room
  // const roomId = getRoomId(senderId, receiverId);
  console.log('roomId: ', roomId)
  socket.broadcast.to(roomId).emit('receiverMessage', newMessage);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((user) => user.userId !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      }
    }
  });
});



  function getRoomId(userId1: string,userId2: string): string{
    return [userId1,userId2].sort().join('_')
  }
};