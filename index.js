const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const { Client } = require('node-osc');

let c = new Client(process.argv[2], 9000);

spawn('app/SkeletonBasics-WPF.exe');

let lerp = (A, B, t) => A + (B - A) * t;
let server = new WebSocket.Server({ port: 9091 });
let connection = null;
let sendSkeleton = true;
let floorOffset = 0;
let flipSkeleton = false;
let enabledTrackers = {
    feet: true,
    waist: true,
    knees: false,
    elbows: false
}

class Vec3{
    constructor(str){
        let s = str.split(',');

        if(flipSkeleton){
            this.x = parseFloat(s[0]) * -1;
            this.y = parseFloat(s[1]) + (floorOffset * 0.1);
            this.z = parseFloat(s[2]);
    
            this.xTarget = parseFloat(s[0]) * -1;
            this.yTarget = parseFloat(s[1]) + (floorOffset * 0.1);
            this.zTarget = parseFloat(s[2]);
        } else{
            this.x = parseFloat(s[0]);
            this.y = parseFloat(s[1]) + (floorOffset * 0.1);
            this.z = parseFloat(s[2]) * -1;

            this.xTarget = parseFloat(s[0]);
            this.yTarget = parseFloat(s[1]) + (floorOffset * 0.1);
            this.zTarget = parseFloat(s[2]) * -1;
        }
    }
    set(str){
        let s = str.split(',');
        if(flipSkeleton){
            this.xTarget = parseFloat(s[0]) * -1;
            this.yTarget = parseFloat(s[1]) + (floorOffset * 0.1);
            this.zTarget = parseFloat(s[2]);
        } else{
            this.xTarget = parseFloat(s[0]);
            this.yTarget = parseFloat(s[1]) + (floorOffset * 0.1);
            this.zTarget = parseFloat(s[2]) * -1;
        }

        this.x = lerp(this.x, this.xTarget, 0.5);
        this.y = lerp(this.y, this.yTarget, 0.5);
        this.z = lerp(this.z, this.zTarget, 0.5);
    }
    toJSON(){
        return [ this.x, this.y, this.z ];
    }
}

server.on('connection', ( sock ) => {
    if(connection)return sock.close();
    console.log('socket connected');

    connection = sock;
    sock.on('message', ( data ) => {
        let msg = JSON.parse(data);

        if(msg.type === 'floorUP')
            floorOffset++;
        
        if(msg.type === 'floorDown')
            floorOffset--;

        if(msg.type === 'flip')
            flipSkeleton = !flipSkeleton

        if(msg.type === 'toggleTrackers')
            enabledTrackers[msg.trackers] = !enabledTrackers[msg.trackers];

        if(msg.type === 'calibrateForwards')
            c.send('/tracking/trackers/head/rotation', 0, 0, 0);
    })

    sock.on('close', () => {
        connection = null;
        console.log('socket closed');
    })
})

let lfoot = new Vec3('0,0,0');
let rfoot = new Vec3('0,0,0');
let waist = new Vec3('0,0,0');
let lknee = new Vec3('0,0,0');
let rknee = new Vec3('0,0,0');
let lElbo = new Vec3('0,0,0');
let rElbo = new Vec3('0,0,0');
let lHand = new Vec3('0,0,0');
let rHand = new Vec3('0,0,0');
let heade = new Vec3('0,0,0');
let leHip = new Vec3('0,0,0');
let riHip = new Vec3('0,0,0');
let shoul = new Vec3('0,0,0');
let lShou = new Vec3('0,0,0');
let rShou = new Vec3('0,0,0');
let spine = new Vec3('0,0,0');

http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    })

    req.on('end', () => {
        if(req.url === '/position'){
            let poses = body.split('/');

            lfoot.set(poses[0]);
            rfoot.set(poses[1]);
            waist.set(poses[2]);
            lknee.set(poses[3]);
            rknee.set(poses[4]);
            lElbo.set(poses[5]);
            rElbo.set(poses[6]);
            lHand.set(poses[7]);
            rHand.set(poses[8]);
            heade.set(poses[9]);
            leHip.set(poses[10]);
            riHip.set(poses[11]);
            shoul.set(poses[12]);
            lShou.set(poses[13]);
            rShou.set(poses[14]);
            spine.set(poses[15]);

            c.send('/tracking/trackers/head/position', heade.x, heade.y, heade.z);

            if(enabledTrackers.feet){
                c.send('/tracking/trackers/1/position', lfoot.x, lfoot.y, lfoot.z);
                c.send('/tracking/trackers/2/position', rfoot.x, rfoot.y, rfoot.z);

                c.send('/tracking/trackers/1/rotation', 0, 0, 0);
                c.send('/tracking/trackers/2/rotation', 0, 0, 0);
            }

            if(enabledTrackers.waist){
                c.send('/tracking/trackers/3/position', waist.x, waist.y, waist.z);
                c.send('/tracking/trackers/3/rotation', 0, 0, 0);
            }

            if(enabledTrackers.knees){
                c.send('/tracking/trackers/4/position', lknee.x, lknee.y, lknee.z);
                c.send('/tracking/trackers/5/position', rknee.x, rknee.y, rknee.z);

                c.send('/tracking/trackers/4/rotation', 0, 0, 0);
                c.send('/tracking/trackers/5/rotation', 0, 0, 0);
            }

            if(enabledTrackers.elbows){
                c.send('/tracking/trackers/6/position', lElbo.x, lElbo.y, lElbo.z);
                c.send('/tracking/trackers/7/position', rElbo.x, rElbo.y, rElbo.z);

                c.send('/tracking/trackers/6/rotation', 0, 0, 0);
                c.send('/tracking/trackers/7/rotation', 0, 0, 0);
            }
    
            if(sendSkeleton && connection){
                connection.send(JSON.stringify({
                    type: 'skeletonUpdate',
                    body: {
                        leftFoot: lfoot.toJSON(),
                        rightFoot: rfoot.toJSON(),
                        waist: waist.toJSON(),
                        leftKnee: lknee.toJSON(),
                        rightKnee: rknee.toJSON(),
                        leftElbow: lElbo.toJSON(),
                        rightElbow: rElbo.toJSON(),
                        leftHand: lHand.toJSON(),
                        rightHand: rHand.toJSON(),
                        head: heade.toJSON(),
                        leftHip: leHip.toJSON(),
                        rightHip: riHip.toJSON(),
                        shoulderCenter: shoul.toJSON(),
                        leftShoulder: lShou.toJSON(),
                        rightShoulder: rShou.toJSON(),
                        spine: spine.toJSON()
                    }
                }))
            }
        }
    })
}).listen(9090);
