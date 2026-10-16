import {Router} from 'express';
import {pool} from '../db.js';
import {requireAuth} from '../middleware/auth.js';
import {analyze} from '../analysis/health.js';

const r=Router();
r.use(requireAuth);

r.get('/',async(q,s,n)=>{
  try{
    const rawLimit=Number(q.query.limit),limit=Math.min(Math.max(Number.isFinite(rawLimit)&&rawLimit>0?Math.floor(rawLimit):100,1),500),vals=[],filters=[];
    if(q.query.motor){if(!/^\d+$/.test(String(q.query.motor)))return s.status(400).json({message:'Motor ID must be a positive integer.'});vals.push(q.query.motor);filters.push(`x.motor_id=$${vals.length}`);}
    if(q.query.source){if(!['hardware','simulation'].includes(q.query.source))return s.status(400).json({message:'Source must be hardware or simulation.'});vals.push(q.query.source);filters.push(`x.source=$${vals.length}`);}
    const where=filters.length?`WHERE ${filters.join(' AND ')}`:'';
    vals.push(limit);
    const {rows}=await pool.query(`SELECT x.id AS "_id",x.motor_id AS "motorId",x.vibration,x.temperature,x.current,x.rpm,x.health,x.status,x.source,x.recorded_at AS "recordedAt",json_build_object('_id',m.id,'name',m.name,'assetId',m.asset_id) AS motor FROM readings x LEFT JOIN motors m ON m.id=x.motor_id ${where} ORDER BY x.recorded_at DESC LIMIT $${vals.length}`,vals);
    s.json(rows);
  }catch(e){n(e);}
});

r.post('/',async(q,s,n)=>{
  let client,transaction=false;
  try{
    const {motorId,vibration,temperature,current,rpm,source='hardware'}=q.body||{};
    if(!/^\d+$/.test(String(motorId??'')))return s.status(400).json({message:'A valid motor ID is required.'});
    if(![vibration,temperature,current,rpm].every(Number.isFinite)||vibration<0||current<0||rpm<0)return s.status(400).json({message:'Vibration, temperature, current and rpm must be numeric; vibration, current and rpm cannot be negative.'});
    if(!['hardware','simulation'].includes(source))return s.status(400).json({message:'Source must be hardware or simulation.'});

    const result=analyze({vibration,temperature,current});
    client=await pool.connect();
    await client.query('BEGIN');transaction=true;
    const motorResult=await client.query('SELECT id,name,asset_id,status FROM motors WHERE id=$1 FOR UPDATE',[motorId]);
    const motor=motorResult.rows[0];
    if(!motor){await client.query('ROLLBACK');transaction=false;return s.status(404).json({message:'Motor not found'});}
    const {rows}=await client.query(`INSERT INTO readings(motor_id,vibration,temperature,current,rpm,health,status,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id AS "_id",motor_id AS "motorId",vibration,temperature,current,rpm,health,status,source,recorded_at AS "recordedAt"`,[motor.id,vibration,temperature,current,rpm,result.health,result.status,source]);
    await client.query('UPDATE motors SET health=$1,status=$2,last_seen=NOW(),updated_at=NOW() WHERE id=$3',[result.health,result.status,motor.id]);
    if(result.status!=='healthy'&&motor.status!==result.status){
      await client.query('INSERT INTO alerts(motor_id,severity,title,message) VALUES($1,$2,$3,$4)',[motor.id,result.status,result.reason,`Health score ${result.health}. Vibration ${vibration} mm/s, temperature ${temperature} °C, current ${current} A.`]);
    }
    await client.query('COMMIT');transaction=false;
    s.status(201).json({reading:{...rows[0],motor:{_id:motor.id,name:motor.name,assetId:motor.asset_id}},analysis:result});
  }catch(e){if(transaction)try{await client.query('ROLLBACK');}catch{}n(e);}
  finally{client?.release();}
});

export default r;
