import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {pool,initializeDatabase} from '../src/db.js';
await initializeDatabase();
const client=await pool.connect();
try{
 await client.query('BEGIN');
 await client.query('TRUNCATE TABLE readings,alerts,maintenance,motors,users RESTART IDENTITY CASCADE');
 await client.query('INSERT INTO users(name,email,username,password_hash,role) VALUES($1,$2,$3,$4,$5)', ['Morgan Lee','admin@motorvibe.local','admin',await bcrypt.hash('MotorVibe!2026',12),'admin']);
 const motors=[
  ['Compressor A-01','MTR-001','Plant floor · Zone A',22,'healthy',96,1284],
  ['Cooling Pump B-04','MTR-004','Utilities · Zone B',15,'warning',72,2088],
  ['Conveyor Drive C-02','MTR-009','Assembly · Zone C',30,'healthy',91,960]
 ];
 const inserted=[];
 for(const m of motors){const{rows}=await client.query('INSERT INTO motors(name,asset_id,location,rated_power,status,health,runtime_hours) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[...m]);inserted.push(rows[0].id);}
 const now=Date.now();
 for(let i=0;i<inserted.length;i++)for(let n=48;n>=0;n--){const d=i===1&&n<24?(24-n)*.035:0;await client.query('INSERT INTO readings(motor_id,vibration,temperature,current,rpm,health,status,source,recorded_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[inserted[i],+(1.5+Math.sin(n/4)*.22+d).toFixed(2),+(62+Math.cos(n/5)*2+d*4).toFixed(1),+(16+i*2+Math.sin(n/3)).toFixed(1),1480+Math.round(Math.sin(n)*8),Math.max(58,98-d*9),i===1&&n<10?'warning':'healthy','simulation',new Date(now-n*1800000)]);}
 await client.query('INSERT INTO alerts(motor_id,severity,title,message) VALUES($1,$2,$3,$4)',[inserted[1],'warning','Vibration trend elevated','Vibration has increased steadily. Inspect the bearing assembly.']);
 await client.query('INSERT INTO maintenance(motor_id,title,description,priority,status,due_date) VALUES($1,$2,$3,$4,$5,$6)',[inserted[1],'Inspect pump bearing assembly','Review vibration trend and check bearing lubrication.','high','open',new Date(now+3*86400000)]);
 await client.query('COMMIT');console.log('Seeded PostgreSQL. Admin: admin@motorvibe.local / MotorVibe!2026');
}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
