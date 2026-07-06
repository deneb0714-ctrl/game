const fs = require('fs');

let MOT = { 
  flags: {}, 
  ENDINGS: { 
    bad_puppet: {key:'bad_puppet'}, 
    END_ORPHAN: {key:'END_ORPHAN'}, 
    normal_daily: {key:'normal_daily'} 
  } 
};

MOT.decideEnding = function () {
  const f = MOT.flags;
  if (f.diedCount > 0) return MOT.ENDINGS.BAD_GAMEOVER;
  
  const allAlive = (!f.killedBoss1 && !f.killedBoss2 && !f.killedTwins);
  
  if (allAlive) {
    if (!f.killedDemonLord) {
      if (f.dollPoints <= 100) { 
        if (f.killingIntent >= 100) {
          return MOT.ENDINGS.hidden_truedemon;
        } else {
          return MOT.ENDINGS.END_ORPHAN;
        }
      } else {
        return MOT.ENDINGS.END_ORPHAN;
      }
    }
  }
  return MOT.ENDINGS.normal_daily;
};

// Simulate what jumpToDemonLordDefeat does for key 1
MOT.flags.finalEnding = null;
delete MOT.flags.kills;
MOT.flags.killedBoss1 = true; MOT.flags.killedBoss2 = true; MOT.flags.killedTwins = true;

let Kills = MOT.flags.kills !== undefined ? MOT.flags.kills : 0;
if (MOT.flags.kills === undefined) {
  if (MOT.flags.killedBoss1) Kills++;
  if (MOT.flags.killedBoss2) Kills++;
  if (MOT.flags.killedTwins) Kills++;
}

console.log("Kills for key 1:", Kills); // Should be 3

if (Kills === 3) {
  MOT.flags.finalEnding = 'bad_puppet';
}

console.log("Final ending for key 1:", MOT.flags.finalEnding || MOT.decideEnding().key);
