import jwt from 'jsonwebtoken';
export function requireAuth(req,res,next){const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');if(!token)return res.status(401).json({message:'Authentication required'});try{req.user=jwt.verify(token,process.env.JWT_SECRET||'development-only-secret-change-me');next();}catch{return res.status(401).json({message:'Session expired. Please sign in again.'});}}
export const requireRole=(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({message:'Insufficient permissions'});
