import express, { Router, Request, Response } from 'express';
import { UserController } from '../controller/user';

const router: Router = express.Router();

router.post('/signup', UserController.registerUser);
router.post('/signup/verify-otp', UserController.verifyOtp)
router.post('/resendotp',UserController.resendOtp)
router.post('/login', UserController.login);
router.post('/getclient',UserController.getClient)
router.post('/getgroup',UserController.getGroup)
router.post('/getmessages',UserController.getMessage)
router.post('/creategroup',UserController.createGroup)
router.post('/joingroup/:groupId',UserController.joinGroup)
router.post('/leavegroup/:groupId',UserController.leaveGroup)
router.post('getgroupmessage',UserController.getGroupMessages)
router.post('/sendgroupmessage',UserController.sendGroupMessage)
router.post('/getmembername',UserController.getmemberName)
router.post('/getusername',UserController.getUsername)
router.post('/loadname',UserController.loadName)

export default router;