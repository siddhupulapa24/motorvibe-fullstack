import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool, initializeDatabase } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import motorRoutes from './src/routes/motors.js';
import telemetryRoutes from './src/routes/telemetry.js';
import alertRoutes from './src/routes/alerts.js';
import maintenanceRoutes from './src/routes/maintenance.js';
const app=express();
app.use(helmet()); app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'})); app.use(express.json({limit:'256kb'}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:100}),authRoutes); app.use('/api/motors',motorRoutes); app.use('/api/telemetry',telemetryRoutes); app.use('/api/alerts',alertRoutes); app.use('/api/maintenance',maintenanceRoutes);
app.get('/api/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({status:'ok',service:'motorvibe-api',database:'connected',databaseType:'PostgreSQL'});}catch{res.status(503).json({status:'error',service:'motorvibe-api',database:'disconnected',databaseType:'PostgreSQL'});}});
app.use((err,_req,res,_next)=>{console.error(err);if(err.code==='23505')return res.status(409).json({message:'That value is already registered.'});res.status(err.status||500).json({message:err.message||'Unexpected server error'});});
const port=process.env.PORT||5000;
try{await initializeDatabase();console.log('PostgreSQL connected; tables are ready.');app.listen(port,()=>console.log(`MotorVibe API listening on http://localhost:${port}`));}catch(error){console.error('PostgreSQL connection failed:',error.message);process.exit(1);}
