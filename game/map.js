// BRASS TIDE / sluice 07. A rewards a long central push; B an east-channel flank.
export const sites=[
 {id:'A',name:'NORTH SPILLWAY',x:0,z:-14,r:2.4},
 {id:'B',name:'EAST INTAKE',x:13,z:-5,r:2.2}
];
export const walls=[
 {x:-17,z:0,w:1,d:44,h:4},{x:17,z:0,w:1,d:44,h:4},
 {x:0,z:22,w:35,d:1,h:4},{x:0,z:-22,w:35,d:1,h:5},
 {x:-7,z:6,w:7,d:9,h:4.8},{x:7,z:4,w:6,d:11,h:4.2},
 {x:-7,z:-10,w:7,d:5,h:5.2},{x:8,z:-12,w:5,d:5,h:4.8},
 {x:0,z:2,w:2.8,d:2.8,h:1.25,kind:'crate'},
 {x:-12.5,z:0,w:2.4,d:3,h:1.8,kind:'crate'},
 {x:12.5,z:10,w:2.5,d:3,h:1.4,kind:'crate'},
 {x:2.3,z:-7,w:3,d:2,h:1.1,kind:'crate'},
 {x:-4,z:14,w:2.2,d:1.5,h:1.1,kind:'crate'},
 {x:-3,z:-19,w:1,d:4,h:2},{x:3,z:-19,w:1,d:4,h:2}
];
// Assignments share the clearance graph, not wall-blind straight-line chasing.
export const holds={A:[[-1,-12],[-13,-14],[1,-16]],B:[[14,-8],[12,-2],[14,-6]]};
// Traversable routing graph. Connections are visibility checked at runtime.
export const nodes=[
 [-13,17],[0,17],[13,17],[-13,12],[0,12],[13,12],[-13,6],[-1,6],[13,6],
 [-13,-4],[-1,-3],[13,-4],[-13,-7],[0,-7],[13,-8],[-13,-16],[-1,-15],[13,-17],[0,-19],[5,-17],
 // Clearance corners make every crate/building bypassable by a .33 m actor.
 ...walls.flatMap(b=>[-1,1].flatMap(dx=>[-1,1].map(dz=>[b.x+dx*(b.w/2+.55),b.z+dz*(b.d/2+.55)])))
].filter(([x,z])=>Math.abs(x)<16.1&&Math.abs(z)<21.1&&!walls.some(b=>Math.abs(x-b.x)<b.w/2+.41&&Math.abs(z-b.z)<b.d/2+.41));
export const names=['YOU','MICA','FINCH','RIVET','CINDER','OXIDE'];
