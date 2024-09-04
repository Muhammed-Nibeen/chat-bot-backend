import jwt from 'jsonwebtoken'

export const generateToken = (userId: string,secretkey: string):string=>{
  return jwt.sign({id: userId},secretkey,{
    expiresIn: '2h',
  })
}