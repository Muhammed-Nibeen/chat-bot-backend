import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose, { Types } from 'mongoose';
import { userCollection } from '../model/userSchema';
import { ResponseStatus } from '../utils/enums';
import { randomBytes } from 'crypto';
import { Otp } from '../model/otpUser';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { generateToken } from '../utils/jwtToken';
import { Message } from '../model/message';
import { Group } from '../model/groupSchema';

dotenv.config()

const sendOtpEmail = async (email:string,otp:string): Promise<void> =>{
  const transporter = nodemailer.createTransport({
      service:"gmail",
      auth:{
          user: "nibiniz339@gmail.com",
          pass:"vfgtouqbqemqffpk"
      }
  })

  const mailOptions = {
      from:process.env.Email_User || '',
      to: email,
      subject: "One-Time Password (Otp) From your health app nurtripal",
      text:`Your Authentication OTP is ${otp}`
  };

  try{
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:',info.response)
  }catch(error){
      console.error('Error sending email:',error);
  }
}

const generateOTP = (length: number): string => {
  const digits = "0123456789";
  let OTP = "";

  for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes(1)[0] % digits.length;
      OTP += digits[randomIndex];
  }

  return OTP;
};

export const UserController = {
  registerUser: asyncHandler(async (req: Request, res: Response) => {
        
    try {
        console.log(req.body,"Hello entered")
        const newUser={
            fullName: req.body.fullName,
            email: req.body.email,
            password: req.body.password
        }
    const emailExists = await userCollection.findOne({email:newUser.email})   
    if(emailExists){
        res.status(ResponseStatus.BadRequest).json({error: 'Email already registered' });
    }else{
        //Generate Otp
        const otp = generateOTP(4)
        console.log(otp)
        await sendOtpEmail(newUser.email,otp)

        //Saving otp to database
        const otpRecord = await Otp.findOne({email:newUser.email})
        try{
            if(otpRecord){
                otpRecord.otp = otp;
                await otpRecord.save();
            }else{
                const newOtpRecord = new Otp({otp:otp,email:newUser.email})
                await Otp.create(newOtpRecord);
            }
        }catch(error){
            console.error('Failed to save Otp',error)
        }
        res.status(ResponseStatus.OK).json({message:'Otp send to mail'})
    }
  }   catch(error){
    res.status(500).json({error:'Internel server error'})
  }    
}),

   //Verifing otp
   verifyOtp: asyncHandler(async(req:Request,res:Response)=>{
    try{
        console.log('This is sucess',req.body)
        const{userData,enteredOtp} = req.body
        const{fullName,email,password} = JSON.parse(userData)
        const otpRecord = await Otp.findOne({email:email})

        if(otpRecord){
            
            if(otpRecord.otp===enteredOtp){
                const hashedPassword = await bcrypt.hash(password,10);

            const newUser={
                fullName,
                email,
                password:hashedPassword
            }
            await userCollection.create(newUser)
            .then(success=>{
                res.status(ResponseStatus.OK).json({message:'Signup successfull'})
            }).catch(error=>{
                console.log('fail',error)
            })
        }else{
            res.status(ResponseStatus.BadRequest).json({error:'Incorrect OTP'})
        }
    }else{
        
        res.status(ResponseStatus.BadRequest).json({message:'OTP is expired'})
    }
}catch(error){
    res.status(500).json({error:'Failed to register'})
}
}),

resendOtp:asyncHandler(async(req:Request,res:Response)=>{
  try{
    console.log("This is final",req.body.email)
    const {email} = req.body
    const otp = generateOTP(4)
    console.log(otp)
    await sendOtpEmail(email,otp)

      // Saving OTP to database
      const otpRecord = await Otp.findOne({ email:email });
      try {
          if (otpRecord) {
              console.log('OTP record not saved in MongoDB');
              await Otp.deleteOne({  email:email  });
          }else{
              const newOtpRecord = new Otp({ otp:otp, email:email });
              await Otp.create(newOtpRecord);
              console.log('New OTP saved in MongoDB');
          }
      } catch (error) {
          console.error('Failed to save OTP:', error);
      }
      res.status(ResponseStatus.OK).json({ message: 'New OTP sent to mail.', email });
  }catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
}),

login: asyncHandler(async (req: Request, res: Response) => {
    try{
        const {email,password} = req.body
        const user = await userCollection.findOne({email:email})
        if(user){
            const hashedPasswordDb = user.password
            const passwordCheck = await bcrypt.compare(password, hashedPasswordDb)

            if(passwordCheck){
                if(!user.isblocked){
                //generate jwt token
                const token = generateToken( user._id as string,process.env.JWT_SECRET as string);
                console.log('This is jwt',token);
                
                res.status(ResponseStatus.OK).json({message:'Login successfull',token,user})
                }else{
                    res.status(ResponseStatus.BadRequest).json({error:'Account is blocked'})
                }
            }else{
                res.status(ResponseStatus.BadRequest).json({error:'Incorrrect password'})
            }
        }else{
            res.status(ResponseStatus.BadRequest).json({error:'Incorrect email and password'})
        }
    }catch(error){
        console.error(error)
        res.status(500).json({error:'Internal server error'})
    }
}),

getClient: asyncHandler(async(req: Request,res: Response) => {
    try{
        const loggedInUserId = req.body.loggedUserId
        
        const clients = await userCollection.find({_id:{ $ne: loggedInUserId}})

        const clientList = clients.map(client =>({
            id: client._id,
            name: client.fullName
        }));
        console.log(clientList,'This is the start of chat');
        res.status(ResponseStatus.OK).json({message:'Login successfull',clientList})
    }catch(error){
        console.error(error)
        res.status(500).json({error:'Internal server error'})
    }
}),

getGroup: asyncHandler(async(req: Request,res: Response) => {
    try{
        const loggedInUserId = req.body.loggedUserId
        
        const loggedInUserObjectId = new mongoose.Types.ObjectId(loggedInUserId);

        // Find groups where the loggedInUserId is either the owner or a member
        const groups = await Group.find({
            $or: [
                { owner: loggedInUserObjectId },       // Check if loggedInUserId is the owner
                { members: loggedInUserObjectId }      // Check if loggedInUserId is in the members array
            ]
        });

        const groupList = groups.map(group => ({
            id: group._id,
            name: group.name,
            owner: group.owner,
            members: group.members,
            createdAt: group.createdAt,
        }));

        console.log(groupList, 'Groups fetched successfully');
        res.status(ResponseStatus.OK).json({ message: 'Groups fetched successfully', groupList });
    }catch(error){
        console.error(error)
        res.status(500).json({error:'Internal server error'})
    }
}),

getMessage:asyncHandler(async(req:Request,res:Response)=>{
    try{
        const {senderId,receiverId} = req.body
        console.log(req.body)
        const messages = await Message.find({
        $or: [
            {senderId: senderId, receiverId: receiverId},
            {senderId: receiverId, receiverId: senderId}
        ]
        }).sort({ timestamp:1 })
        
        // Update message statuses to 'read'
        // await Message.updateMany({
        //     $or: [
        //         { senderId: senderId, receiverId: receiverId, messagestatus: 'unread' },
        //         { senderId: receiverId, receiverId: senderId, messagestatus: 'unread' }
        //     ]
        // }, {
        //     $set: { messagestatus: 'read' }
        // });
        // console.log('this is fetched',messages);

        res.status(ResponseStatus.OK).json({message:'Successfully fetched the messages',messages})
    }catch(error){
        console.error(error)
        res.status(ResponseStatus.BadRequest).json({error:'Internal server error'})
    }
  }),

  createGroup : asyncHandler(async (req:Request,res:Response) => {
    try {
        console.log('This is created group',req.body);
        
        const { userId, groupName,memberIds } = req.body;

        const group = new Group({
            name: groupName,
            owner: [new Types.ObjectId(userId)],
            members: memberIds.map((id: string) => new Types.ObjectId(id)),
        });
        console.log('This is the group',group);
        
        const savedGroup = await group.save();

        res.status(ResponseStatus.OK).json({ message: 'Group created successfully', group:savedGroup });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}),

joinGroup : asyncHandler(async (req:Request,res:Response) => {
    try {
        const { groupId, userId } = req.body;

        const group = await Group.findById(groupId);
        if (!group) {
         res.status(404).json({ error: 'Group not found' });
         return
        }

        // Check if the user is already a member
        if (group.members.includes(userId)) {
         res.status(400).json({ error: 'User is already a member of this group' });
         return
        }

        group.members.push(userId);
        await group.save();

        res.status(200).json({ message: 'Successfully joined the group' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}),

leaveGroup : asyncHandler(async (req:Request,res:Response) => {
    try {
        const { groupId, userId } = req.body;

        const group = await Group.findById(groupId);
        if (!group) {
             res.status(404).json({ error: 'Group not found' });
             return
        }

        // Check if the user is a member
        if (!group.members.includes(userId)) {
             res.status(400).json({ error: 'User is not a member of this group' });
             return
        }

        group.members = group.members.filter(member => member.toString() !== userId);
        await group.save();

        res.status(200).json({ message: 'Successfully left the group' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}),

getGroupMessages : asyncHandler(async (req:Request,res:Response) => {
    try {
        const { groupId } = req.body;

        const messages = await Message.find({ groupId }).sort({ timestamp: 1 });

        res.status(200).json({ message: 'Successfully fetched the group messages', messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}),

sendGroupMessage : asyncHandler(async (req:Request,res:Response) => {
    try {
        const { senderId, groupId, message } = req.body;

        const newMessage = new Message({
            message,
            senderId,
            groupId,
            timestamp: new Date(),
        });

        await newMessage.save();

        res.status(200).json({ message: 'Message sent successfully', newMessage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}),

getmemberName : asyncHandler(async (req:Request,res:Response) => {
    try{
        console.log('Enterd backend');
        
        const groupIdS = req.body.senderId
        
        const groupId = new mongoose.Types.ObjectId(groupIdS);
        console.log('Enterd is groupID',groupId);
        // Fetch the group details from the Message collection
        const group = await Group.findOne({ owner: groupId }, 'owner members')
        console.log('Enterd',group);
        if (!group) {
            res.status(404).json({ error: 'Group not found' });
            return
        }
       
        
        const userIds = [group.owner, ...group.members];
        const users = await userCollection.find({ _id: { $in: userIds } }, 'fullName').exec();
        const usernames = users.map(user => user.fullName);
        console.log(usernames,'This is username');
        
        res.status(ResponseStatus.OK).json({ message: 'Groups fetched successfully', usernames });
    }catch(error){
        console.error(error)
        res.status(500).json({error:'Internal server error'})
    }
}),

getUsername : asyncHandler(async (req:Request,res:Response) => {
    try{
        console.log('Enterd backend');
        
        const userIdS = req.body.senderId
        
        const userId = new mongoose.Types.ObjectId(userIdS);
        console.log('Enterd is groupID',userId);

        const username = await userCollection.findById(userId).select('fullName')
        res.status(ResponseStatus.OK).json({ message: 'Groups fetched successfully', username });
    }catch(error){
        console.error(error)
        res.status(500).json({error:'Internal server error'})
    }
}),
 
 loadName : asyncHandler(async (req:Request,res:Response) => {
    try{
        
        const userIdS = req.body.senderId
        
        const userId = new mongoose.Types.ObjectId(userIdS);
        console.log('Enterd is usernameId',userId);

        const username = await userCollection.findById(userId).select('fullName')
        console.log('Enterd is username',username);
        res.status(ResponseStatus.OK).json({ message: 'Groups fetched successfully', username });
    }catch(error){
        console.error(error)
        res.status(500).json({error:'Internal server error'})
    }
}),
}