var lt=Object.defineProperty;var ht=(M,n,o)=>n in M?lt(M,n,{enumerable:!0,configurable:!0,writable:!0,value:o}):M[n]=o;var m=(M,n,o)=>ht(M,typeof n!="symbol"?n+"":n,o);import{E as dt,V as u,M as V,T as W,S as Ie,Q as Fe,a as A,R as mt,P as ut,b as pt,O as ft,G as F,C as b,I as gt,D as yt,c as wt,d as vt,e as bt,f as X,B as te,g as Ye,h as oe,i as _,F as Mt,j as pe,k as ne,l as fe,m as O,n as xt,o as St,p as T,A as he,q as de,r as Ct,s as Pt,t as Tt,u as Et,v as zt,w as At,x as kt,y as Dt,W as Lt,z as Rt,H as Ot,J as It,K as Ft,L as Nt,N as Ne,U as je,X as Ge,Y as me}from"./three-BphxAVcL.js";import{l as jt}from"./lottie-D_akyxJo.js";(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))e(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&e(r)}).observe(document,{childList:!0,subtree:!0});function o(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function e(a){if(a.ep)return;a.ep=!0;const i=o(a);fetch(a.href,i)}})();const Ve={type:"change"},ue={type:"start"},We={type:"end"},ee=new mt,_e=new ut,Gt=Math.cos(70*pt.DEG2RAD);class Vt extends dt{constructor(n,o){super(),this.object=n,this.domElement=o,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new u,this.cursor=new u,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:V.ROTATE,MIDDLE:V.DOLLY,RIGHT:V.PAN},this.touches={ONE:W.ROTATE,TWO:W.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return s.phi},this.getAzimuthalAngle=function(){return s.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(t){t.addEventListener("keydown",le),this._domElementKeyEvents=t},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",le),this._domElementKeyEvents=null},this.saveState=function(){e.target0.copy(e.target),e.position0.copy(e.object.position),e.zoom0=e.object.zoom},this.reset=function(){e.target.copy(e.target0),e.object.position.copy(e.position0),e.object.zoom=e.zoom0,e.object.updateProjectionMatrix(),e.dispatchEvent(Ve),e.update(),i=a.NONE},this.update=function(){const t=new u,h=new Fe().setFromUnitVectors(n.up,new u(0,1,0)),g=h.clone().invert(),v=new u,C=new Fe,R=new u,z=2*Math.PI;return function(ct=null){const Oe=e.object.position;t.copy(Oe).sub(e.target),t.applyQuaternion(h),s.setFromVector3(t),e.autoRotate&&i===a.NONE&&B(Be(ct)),e.enableDamping?(s.theta+=l.theta*e.dampingFactor,s.phi+=l.phi*e.dampingFactor):(s.theta+=l.theta,s.phi+=l.phi);let k=e.minAzimuthAngle,D=e.maxAzimuthAngle;isFinite(k)&&isFinite(D)&&(k<-Math.PI?k+=z:k>Math.PI&&(k-=z),D<-Math.PI?D+=z:D>Math.PI&&(D-=z),k<=D?s.theta=Math.max(k,Math.min(D,s.theta)):s.theta=s.theta>(k+D)/2?Math.max(k,s.theta):Math.min(D,s.theta)),s.phi=Math.max(e.minPolarAngle,Math.min(e.maxPolarAngle,s.phi)),s.makeSafe(),e.enableDamping===!0?e.target.addScaledVector(p,e.dampingFactor):e.target.add(p),e.target.sub(e.cursor),e.target.clampLength(e.minTargetRadius,e.maxTargetRadius),e.target.add(e.cursor),e.zoomToCursor&&Z||e.object.isOrthographicCamera?s.radius=re(s.radius):s.radius=re(s.radius*c),t.setFromSpherical(s),t.applyQuaternion(g),Oe.copy(e.target).add(t),e.object.lookAt(e.target),e.enableDamping===!0?(l.theta*=1-e.dampingFactor,l.phi*=1-e.dampingFactor,p.multiplyScalar(1-e.dampingFactor)):(l.set(0,0,0),p.set(0,0,0));let $=!1;if(e.zoomToCursor&&Z){let U=null;if(e.object.isPerspectiveCamera){const q=t.length();U=re(q*c);const J=q-U;e.object.position.addScaledVector(ge,J),e.object.updateMatrixWorld()}else if(e.object.isOrthographicCamera){const q=new u(L.x,L.y,0);q.unproject(e.object),e.object.zoom=Math.max(e.minZoom,Math.min(e.maxZoom,e.object.zoom/c)),e.object.updateProjectionMatrix(),$=!0;const J=new u(L.x,L.y,0);J.unproject(e.object),e.object.position.sub(J).add(q),e.object.updateMatrixWorld(),U=t.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),e.zoomToCursor=!1;U!==null&&(this.screenSpacePanning?e.target.set(0,0,-1).transformDirection(e.object.matrix).multiplyScalar(U).add(e.object.position):(ee.origin.copy(e.object.position),ee.direction.set(0,0,-1).transformDirection(e.object.matrix),Math.abs(e.object.up.dot(ee.direction))<Gt?n.lookAt(e.target):(_e.setFromNormalAndCoplanarPoint(e.object.up,e.target),ee.intersectPlane(_e,e.target))))}else e.object.isOrthographicCamera&&($=c!==1,$&&(e.object.zoom=Math.max(e.minZoom,Math.min(e.maxZoom,e.object.zoom/c)),e.object.updateProjectionMatrix()));return c=1,Z=!1,$||v.distanceToSquared(e.object.position)>r||8*(1-C.dot(e.object.quaternion))>r||R.distanceToSquared(e.target)>0?(e.dispatchEvent(Ve),v.copy(e.object.position),C.copy(e.object.quaternion),R.copy(e.target),!0):!1}}(),this.dispose=function(){e.domElement.removeEventListener("contextmenu",Le),e.domElement.removeEventListener("pointerdown",ze),e.domElement.removeEventListener("pointercancel",H),e.domElement.removeEventListener("wheel",Ae),e.domElement.removeEventListener("pointermove",ce),e.domElement.removeEventListener("pointerup",H),e._domElementKeyEvents!==null&&(e._domElementKeyEvents.removeEventListener("keydown",le),e._domElementKeyEvents=null)};const e=this,a={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let i=a.NONE;const r=1e-6,s=new Ie,l=new Ie;let c=1;const p=new u,d=new A,f=new A,w=new A,y=new A,x=new A,P=new A,E=new A,N=new A,I=new A,ge=new u,L=new A;let Z=!1;const S=[],Y={};let ae=!1;function Be(t){return t!==null?2*Math.PI/60*e.autoRotateSpeed*t:2*Math.PI/60/60*e.autoRotateSpeed}function K(t){const h=Math.abs(t*.01);return Math.pow(.95,e.zoomSpeed*h)}function B(t){l.theta-=t}function Q(t){l.phi-=t}const ye=function(){const t=new u;return function(g,v){t.setFromMatrixColumn(v,0),t.multiplyScalar(-g),p.add(t)}}(),we=function(){const t=new u;return function(g,v){e.screenSpacePanning===!0?t.setFromMatrixColumn(v,1):(t.setFromMatrixColumn(v,0),t.crossVectors(e.object.up,t)),t.multiplyScalar(g),p.add(t)}}(),j=function(){const t=new u;return function(g,v){const C=e.domElement;if(e.object.isPerspectiveCamera){const R=e.object.position;t.copy(R).sub(e.target);let z=t.length();z*=Math.tan(e.object.fov/2*Math.PI/180),ye(2*g*z/C.clientHeight,e.object.matrix),we(2*v*z/C.clientHeight,e.object.matrix)}else e.object.isOrthographicCamera?(ye(g*(e.object.right-e.object.left)/e.object.zoom/C.clientWidth,e.object.matrix),we(v*(e.object.top-e.object.bottom)/e.object.zoom/C.clientHeight,e.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),e.enablePan=!1)}}();function ie(t){e.object.isPerspectiveCamera||e.object.isOrthographicCamera?c/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),e.enableZoom=!1)}function ve(t){e.object.isPerspectiveCamera||e.object.isOrthographicCamera?c*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),e.enableZoom=!1)}function se(t,h){if(!e.zoomToCursor)return;Z=!0;const g=e.domElement.getBoundingClientRect(),v=t-g.left,C=h-g.top,R=g.width,z=g.height;L.x=v/R*2-1,L.y=-(C/z)*2+1,ge.set(L.x,L.y,1).unproject(e.object).sub(e.object.position).normalize()}function re(t){return Math.max(e.minDistance,Math.min(e.maxDistance,t))}function be(t){d.set(t.clientX,t.clientY)}function He(t){se(t.clientX,t.clientX),E.set(t.clientX,t.clientY)}function Me(t){y.set(t.clientX,t.clientY)}function Ue(t){f.set(t.clientX,t.clientY),w.subVectors(f,d).multiplyScalar(e.rotateSpeed);const h=e.domElement;B(2*Math.PI*w.x/h.clientHeight),Q(2*Math.PI*w.y/h.clientHeight),d.copy(f),e.update()}function qe(t){N.set(t.clientX,t.clientY),I.subVectors(N,E),I.y>0?ie(K(I.y)):I.y<0&&ve(K(I.y)),E.copy(N),e.update()}function Xe(t){x.set(t.clientX,t.clientY),P.subVectors(x,y).multiplyScalar(e.panSpeed),j(P.x,P.y),y.copy(x),e.update()}function Ze(t){se(t.clientX,t.clientY),t.deltaY<0?ve(K(t.deltaY)):t.deltaY>0&&ie(K(t.deltaY)),e.update()}function Ke(t){let h=!1;switch(t.code){case e.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?Q(2*Math.PI*e.rotateSpeed/e.domElement.clientHeight):j(0,e.keyPanSpeed),h=!0;break;case e.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?Q(-2*Math.PI*e.rotateSpeed/e.domElement.clientHeight):j(0,-e.keyPanSpeed),h=!0;break;case e.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?B(2*Math.PI*e.rotateSpeed/e.domElement.clientHeight):j(e.keyPanSpeed,0),h=!0;break;case e.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?B(-2*Math.PI*e.rotateSpeed/e.domElement.clientHeight):j(-e.keyPanSpeed,0),h=!0;break}h&&(t.preventDefault(),e.update())}function xe(t){if(S.length===1)d.set(t.pageX,t.pageY);else{const h=G(t),g=.5*(t.pageX+h.x),v=.5*(t.pageY+h.y);d.set(g,v)}}function Se(t){if(S.length===1)y.set(t.pageX,t.pageY);else{const h=G(t),g=.5*(t.pageX+h.x),v=.5*(t.pageY+h.y);y.set(g,v)}}function Ce(t){const h=G(t),g=t.pageX-h.x,v=t.pageY-h.y,C=Math.sqrt(g*g+v*v);E.set(0,C)}function Qe(t){e.enableZoom&&Ce(t),e.enablePan&&Se(t)}function $e(t){e.enableZoom&&Ce(t),e.enableRotate&&xe(t)}function Pe(t){if(S.length==1)f.set(t.pageX,t.pageY);else{const g=G(t),v=.5*(t.pageX+g.x),C=.5*(t.pageY+g.y);f.set(v,C)}w.subVectors(f,d).multiplyScalar(e.rotateSpeed);const h=e.domElement;B(2*Math.PI*w.x/h.clientHeight),Q(2*Math.PI*w.y/h.clientHeight),d.copy(f)}function Te(t){if(S.length===1)x.set(t.pageX,t.pageY);else{const h=G(t),g=.5*(t.pageX+h.x),v=.5*(t.pageY+h.y);x.set(g,v)}P.subVectors(x,y).multiplyScalar(e.panSpeed),j(P.x,P.y),y.copy(x)}function Ee(t){const h=G(t),g=t.pageX-h.x,v=t.pageY-h.y,C=Math.sqrt(g*g+v*v);N.set(0,C),I.set(0,Math.pow(N.y/E.y,e.zoomSpeed)),ie(I.y),E.copy(N);const R=(t.pageX+h.x)*.5,z=(t.pageY+h.y)*.5;se(R,z)}function Je(t){e.enableZoom&&Ee(t),e.enablePan&&Te(t)}function et(t){e.enableZoom&&Ee(t),e.enableRotate&&Pe(t)}function ze(t){e.enabled!==!1&&(S.length===0&&(e.domElement.setPointerCapture(t.pointerId),e.domElement.addEventListener("pointermove",ce),e.domElement.addEventListener("pointerup",H)),st(t),t.pointerType==="touch"?De(t):tt(t))}function ce(t){e.enabled!==!1&&(t.pointerType==="touch"?it(t):nt(t))}function H(t){switch(rt(t),S.length){case 0:e.domElement.releasePointerCapture(t.pointerId),e.domElement.removeEventListener("pointermove",ce),e.domElement.removeEventListener("pointerup",H),e.dispatchEvent(We),i=a.NONE;break;case 1:const h=S[0],g=Y[h];De({pointerId:h,pageX:g.x,pageY:g.y});break}}function tt(t){let h;switch(t.button){case 0:h=e.mouseButtons.LEFT;break;case 1:h=e.mouseButtons.MIDDLE;break;case 2:h=e.mouseButtons.RIGHT;break;default:h=-1}switch(h){case V.DOLLY:if(e.enableZoom===!1)return;He(t),i=a.DOLLY;break;case V.ROTATE:if(t.ctrlKey||t.metaKey||t.shiftKey){if(e.enablePan===!1)return;Me(t),i=a.PAN}else{if(e.enableRotate===!1)return;be(t),i=a.ROTATE}break;case V.PAN:if(t.ctrlKey||t.metaKey||t.shiftKey){if(e.enableRotate===!1)return;be(t),i=a.ROTATE}else{if(e.enablePan===!1)return;Me(t),i=a.PAN}break;default:i=a.NONE}i!==a.NONE&&e.dispatchEvent(ue)}function nt(t){switch(i){case a.ROTATE:if(e.enableRotate===!1)return;Ue(t);break;case a.DOLLY:if(e.enableZoom===!1)return;qe(t);break;case a.PAN:if(e.enablePan===!1)return;Xe(t);break}}function Ae(t){e.enabled===!1||e.enableZoom===!1||i!==a.NONE||(t.preventDefault(),e.dispatchEvent(ue),Ze(ot(t)),e.dispatchEvent(We))}function ot(t){const h=t.deltaMode,g={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(h){case 1:g.deltaY*=16;break;case 2:g.deltaY*=100;break}return t.ctrlKey&&!ae&&(g.deltaY*=10),g}function at(t){t.key==="Control"&&(ae=!0,e.domElement.getRootNode().addEventListener("keyup",ke,{passive:!0,capture:!0}))}function ke(t){t.key==="Control"&&(ae=!1,e.domElement.getRootNode().removeEventListener("keyup",ke,{passive:!0,capture:!0}))}function le(t){e.enabled===!1||e.enablePan===!1||Ke(t)}function De(t){switch(Re(t),S.length){case 1:switch(e.touches.ONE){case W.ROTATE:if(e.enableRotate===!1)return;xe(t),i=a.TOUCH_ROTATE;break;case W.PAN:if(e.enablePan===!1)return;Se(t),i=a.TOUCH_PAN;break;default:i=a.NONE}break;case 2:switch(e.touches.TWO){case W.DOLLY_PAN:if(e.enableZoom===!1&&e.enablePan===!1)return;Qe(t),i=a.TOUCH_DOLLY_PAN;break;case W.DOLLY_ROTATE:if(e.enableZoom===!1&&e.enableRotate===!1)return;$e(t),i=a.TOUCH_DOLLY_ROTATE;break;default:i=a.NONE}break;default:i=a.NONE}i!==a.NONE&&e.dispatchEvent(ue)}function it(t){switch(Re(t),i){case a.TOUCH_ROTATE:if(e.enableRotate===!1)return;Pe(t),e.update();break;case a.TOUCH_PAN:if(e.enablePan===!1)return;Te(t),e.update();break;case a.TOUCH_DOLLY_PAN:if(e.enableZoom===!1&&e.enablePan===!1)return;Je(t),e.update();break;case a.TOUCH_DOLLY_ROTATE:if(e.enableZoom===!1&&e.enableRotate===!1)return;et(t),e.update();break;default:i=a.NONE}}function Le(t){e.enabled!==!1&&t.preventDefault()}function st(t){S.push(t.pointerId)}function rt(t){delete Y[t.pointerId];for(let h=0;h<S.length;h++)if(S[h]==t.pointerId){S.splice(h,1);return}}function Re(t){let h=Y[t.pointerId];h===void 0&&(h=new A,Y[t.pointerId]=h),h.set(t.pageX,t.pageY)}function G(t){const h=t.pointerId===S[0]?S[1]:S[0];return Y[h]}e.domElement.addEventListener("contextmenu",Le),e.domElement.addEventListener("pointerdown",ze),e.domElement.addEventListener("pointercancel",H),e.domElement.addEventListener("wheel",Ae,{passive:!1}),e.domElement.getRootNode().addEventListener("keydown",at,{passive:!0,capture:!0}),this.update()}}class Wt{constructor(n,o,e){m(this,"position");m(this,"velocity");m(this,"acceleration");m(this,"maxSpeed");m(this,"maxForce");this.position=new u(n,o,e),this.velocity=new u((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2),this.acceleration=new u,this.maxSpeed=.5,this.maxForce=.03}applyForce(n){this.acceleration.add(n)}seek(n){const o=new u().subVectors(n,this.position);o.normalize(),o.multiplyScalar(this.maxSpeed);const e=new u().subVectors(o,this.velocity);return e.clampLength(0,this.maxForce),e}flee(n){const o=new u().subVectors(this.position,n);o.normalize(),o.multiplyScalar(this.maxSpeed);const e=new u().subVectors(o,this.velocity);return e.clampLength(0,this.maxForce),e}update(){this.velocity.add(this.acceleration),this.velocity.clampLength(0,this.maxSpeed),this.position.add(this.velocity),this.acceleration.multiplyScalar(0)}}class _t{constructor(n,o){m(this,"boids");m(this,"params");m(this,"bounds");this.boids=[],this.bounds=o,this.params={alignment:1,cohesion:.8,separation:1.5,maxSpeed:.5,maxForce:.03,neighborRadius:2};const e=new u;o.getSize(e);const a=new u;o.getCenter(a);for(let i=0;i<n;i++){const r=a.x+(Math.random()-.5)*e.x*.8,s=a.y+(Math.random()-.5)*e.y*.8,l=a.z+(Math.random()-.5)*e.z*.8,c=new Wt(r,s,l);c.maxSpeed=this.params.maxSpeed,c.maxForce=this.params.maxForce,this.boids.push(c)}}alignment(n,o){const e=new u;if(o.length===0)return e;for(const i of o)e.add(i.velocity);e.divideScalar(o.length),e.normalize(),e.multiplyScalar(n.maxSpeed);const a=new u().subVectors(e,n.velocity);return a.clampLength(0,n.maxForce),a}cohesion(n,o){const e=new u;if(o.length===0)return e;for(const a of o)e.add(a.position);return e.divideScalar(o.length),n.seek(e)}separation(n,o){const e=new u;for(const a of o){const i=n.position.distanceTo(a.position);if(i>0&&i<1){const r=new u().subVectors(n.position,a.position);r.normalize(),r.divideScalar(i),e.add(r)}}return o.length>0&&e.divideScalar(o.length),e.length()>0&&(e.normalize(),e.multiplyScalar(n.maxSpeed),e.sub(n.velocity),e.clampLength(0,n.maxForce)),e}boundaries(n){const o=new u,e=1;return n.position.x<this.bounds.min.x+e?o.x=n.maxSpeed:n.position.x>this.bounds.max.x-e&&(o.x=-n.maxSpeed),n.position.y<this.bounds.min.y+e?o.y=n.maxSpeed:n.position.y>this.bounds.max.y-e&&(o.y=-n.maxSpeed),n.position.z<this.bounds.min.z+e?o.z=n.maxSpeed:n.position.z>this.bounds.max.z-e&&(o.z=-n.maxSpeed),o}getNeighbors(n){const o=[];for(const e of this.boids)e!==n&&n.position.distanceTo(e.position)<this.params.neighborRadius&&o.push(e);return o}update(){for(const n of this.boids){const o=this.getNeighbors(n),e=this.alignment(n,o),a=this.cohesion(n,o),i=this.separation(n,o),r=this.boundaries(n);e.multiplyScalar(this.params.alignment),a.multiplyScalar(this.params.cohesion),i.multiplyScalar(this.params.separation),r.multiplyScalar(2),n.applyForce(e),n.applyForce(a),n.applyForce(i),n.applyForce(r),n.update()}}}class Yt{constructor(n,o){m(this,"group");m(this,"instancedMeshes",[]);m(this,"boids");m(this,"fishCount");m(this,"dummy",new ft);m(this,"variants");this.group=new F,n.add(this.group);const e=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);this.fishCount=e?50:120,this.variants=this.createFishVariants(),this.boids=new _t(this.fishCount,o),this.createDetailedFishMeshes()}createFishVariants(){return[{name:"Tropical",primaryColor:new b(16739125),secondaryColor:new b(16766720),scale:1,speed:1},{name:"Angelfish",primaryColor:new b(8900331),secondaryColor:new b(4286945),scale:1.3,speed:.8},{name:"Neon",primaryColor:new b(65535),secondaryColor:new b(16716947),scale:.7,speed:1.5},{name:"Goldfish",primaryColor:new b(16766720),secondaryColor:new b(16747520),scale:1.1,speed:.9}]}createDetailedFishMeshes(){const n=Math.ceil(this.fishCount/this.variants.length);this.variants.forEach((o,e)=>{const a=Math.min(n,this.fishCount-e*n);if(a<=0)return;const i=this.createDetailedFishGeometry(o),r=this.createFishMaterial(o),s=new gt(i,r,a);s.instanceMatrix.setUsage(yt),s.castShadow=!0,s.receiveShadow=!0;const l=new Float32Array(a*3);for(let c=0;c<a;c++){const p=Math.random()*.1-.05,d=.8+Math.random()*.2,f=.5+Math.random()*.3,w=new b;w.setHSL((o.primaryColor.getHSL({}).h+p)%1,d,f),l[c*3]=w.r,l[c*3+1]=w.g,l[c*3+2]=w.b}s.instanceColor=new wt(l,3),this.instancedMeshes.push(s),this.group.add(s)})}createDetailedFishGeometry(n){const o=new vt;o.moveTo(0,0),o.quadraticCurveTo(.4,.25,.8,.15),o.quadraticCurveTo(1.2,.08,1.5,0),o.quadraticCurveTo(1.2,-.08,.8,-.15),o.quadraticCurveTo(.4,-.25,0,0);const e={depth:.3,bevelEnabled:!0,bevelSegments:3,steps:2,bevelSize:.03,bevelThickness:.03},a=new bt(o,e);a.center();const i=new X(.2,.6,6);i.rotateZ(Math.PI/2),i.translate(-.8,0,0);const r=new X(.08,.25,4);r.rotateZ(-Math.PI/3),r.rotateY(Math.PI/6),r.translate(.3,.15,.12),r.clone().translate(0,-.3,-.24);const l=new X(.12,.4,5);l.rotateX(Math.PI/2),l.translate(.2,.2,0);const c=new X(.06,.15,4);c.rotateX(-Math.PI/2),c.translate(.1,-.18,0);const p=new te;return p.copy(a),p.scale(n.scale,n.scale,n.scale),p}createFishMaterial(n){const o=document.createElement("canvas");o.width=256,o.height=256;const e=o.getContext("2d"),a=e.createLinearGradient(0,0,o.width,o.height);a.addColorStop(0,n.primaryColor.getStyle()),a.addColorStop(.5,n.secondaryColor.getStyle()),a.addColorStop(1,n.primaryColor.clone().multiplyScalar(.7).getStyle()),e.fillStyle=a,e.fillRect(0,0,o.width,o.height),e.globalCompositeOperation="overlay";for(let r=0;r<o.width;r+=12)for(let s=0;s<o.height;s+=12){const l=s%24===0?6:0;e.fillStyle=`rgba(255, 255, 255, ${.1+Math.random()*.1})`,e.beginPath(),e.arc(r+l,s,4,0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over";const i=new Ye(o);return i.wrapS=oe,i.wrapT=oe,new _({map:i,color:16777215,metalness:.1,roughness:.3,clearcoat:.8,clearcoatRoughness:.2,reflectivity:.9,envMapIntensity:.5,transparent:!1,side:Mt})}update(n,o){this.boids.update();let e=0;this.instancedMeshes.forEach((a,i)=>{const r=this.variants[i],s=a.count;for(let l=0;l<s&&e<this.boids.boids.length;l++,e++){const c=this.boids.boids[e];this.dummy.position.copy(c.position);const p=c.velocity.clone().normalize();p.length()>0&&this.dummy.lookAt(c.position.x+p.x,c.position.y+p.y,c.position.z+p.z);const d=r.speed*8,f=Math.sin(o*d+e)*.08;this.dummy.rotation.z+=f;const w=Math.sin(o*d*2+e)*.15;this.dummy.rotation.y+=w;const y=c.velocity.length();this.dummy.rotation.x+=y*.3;const x=r.scale*(.9+Math.sin(o+e)*.05);this.dummy.scale.set(x,x,x),this.dummy.updateMatrix(),a.setMatrixAt(l,this.dummy.matrix)}a.instanceMatrix.needsUpdate=!0})}setMotionEnabled(n){if(!n)for(const o of this.boids.boids)o.velocity.multiplyScalar(0),o.acceleration.multiplyScalar(0)}}var Bt=`varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vScreenPosition;

uniform float time;
uniform vec3 cameraPosition;

vec3 gerstnerWave(vec2 direction, float amplitude, float frequency, float speed, vec2 position, float time) {
  float phase = frequency * dot(direction, position) + speed * time;
  float c = cos(phase);
  float s = sin(phase);
  
  return vec3(
    direction.x * amplitude * s,
    amplitude * c,
    direction.y * amplitude * s
  );
}

void main() {
  vUv = uv;
  
  vec3 pos = position;
  vec2 worldPos = pos.xz;
  
  
  vec3 wave1 = gerstnerWave(normalize(vec2(1.0, 0.3)), 0.08, 0.8, 1.2, worldPos, time);
  vec3 wave2 = gerstnerWave(normalize(vec2(0.7, 1.0)), 0.06, 1.2, 0.8, worldPos, time * 1.1);
  vec3 wave3 = gerstnerWave(normalize(vec2(-0.5, 0.8)), 0.04, 2.0, 1.5, worldPos, time * 0.9);
  vec3 wave4 = gerstnerWave(normalize(vec2(0.2, -1.0)), 0.03, 3.0, 2.0, worldPos, time * 1.3);
  
  vec3 waveSum = wave1 + wave2 + wave3 + wave4;
  pos += waveSum;
  
  
  float normalStrength = 0.3;
  vec3 tangent = normalize(vec3(1.0, 0.0, 0.0));
  vec3 bitangent = normalize(vec3(0.0, 0.0, 1.0));
  
  
  float offset = 0.01;
  vec3 posX = position + vec3(offset, 0.0, 0.0);
  vec3 posZ = position + vec3(0.0, 0.0, offset);
  
  posX += gerstnerWave(normalize(vec2(1.0, 0.3)), 0.08, 0.8, 1.2, posX.xz, time);
  posX += gerstnerWave(normalize(vec2(0.7, 1.0)), 0.06, 1.2, 0.8, posX.xz, time * 1.1);
  posX += gerstnerWave(normalize(vec2(-0.5, 0.8)), 0.04, 2.0, 1.5, posX.xz, time * 0.9);
  posX += gerstnerWave(normalize(vec2(0.2, -1.0)), 0.03, 3.0, 2.0, posX.xz, time * 1.3);
  
  posZ += gerstnerWave(normalize(vec2(1.0, 0.3)), 0.08, 0.8, 1.2, posZ.xz, time);
  posZ += gerstnerWave(normalize(vec2(0.7, 1.0)), 0.06, 1.2, 0.8, posZ.xz, time * 1.1);
  posZ += gerstnerWave(normalize(vec2(-0.5, 0.8)), 0.04, 2.0, 1.5, posZ.xz, time * 0.9);
  posZ += gerstnerWave(normalize(vec2(0.2, -1.0)), 0.03, 3.0, 2.0, posZ.xz, time * 1.3);
  
  vec3 dx = posX - pos;
  vec3 dz = posZ - pos;
  
  vec3 normal = normalize(cross(dx, dz));
  vNormal = normalMatrix * normal;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;
  
  vec4 viewPosition = viewMatrix * worldPosition;
  vViewPosition = viewPosition.xyz;
  
  gl_Position = projectionMatrix * viewPosition;
  vScreenPosition = gl_Position;
}`,Ht=`varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vScreenPosition;

uniform float time;
uniform sampler2D normalMap;
uniform samplerCube envMap;
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
uniform vec3 lightColor;

float fresnel(vec3 eyeVector, vec3 worldNormal, float power) {
  return pow(1.0 - max(dot(eyeVector, worldNormal), 0.0), power);
}

float caustics(vec2 uv, float time) {
  vec2 p = uv * 8.0;
  float c = 0.0;
  
  for(int i = 0; i < 3; i++) {
    float t = time * 0.5 + float(i) * 2.1;
    vec2 offset = vec2(sin(t * 1.3) * 0.5, cos(t * 0.7) * 0.3);
    
    vec2 q = p + offset;
    c += abs(sin(q.x + q.y + t) * sin(q.x - q.y + t * 0.8));
  }
  
  return c * 0.3;
}

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  
  for(int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  
  
  vec2 normalUv1 = vUv * 4.0 + vec2(time * 0.03, time * 0.02);
  vec2 normalUv2 = vUv * 2.5 - vec2(time * 0.02, time * 0.04);
  vec2 normalUv3 = vUv * 6.0 + vec2(time * 0.01, -time * 0.03);
  
  vec3 normal1 = texture2D(normalMap, normalUv1).xyz * 2.0 - 1.0;
  vec3 normal2 = texture2D(normalMap, normalUv2).xyz * 2.0 - 1.0;
  vec3 normal3 = texture2D(normalMap, normalUv3).xyz * 2.0 - 1.0;
  
  vec3 combinedNormal = normalize(normal1 * 0.5 + normal2 * 0.3 + normal3 * 0.2);
  vec3 worldNormal = normalize(vNormal + combinedNormal * 0.3);
  
  
  vec3 reflectedDirection = reflect(-viewDirection, worldNormal);
  vec3 envColor = textureCube(envMap, reflectedDirection).rgb;
  
  
  float fresnelTerm = fresnel(viewDirection, worldNormal, 2.0);
  
  
  vec3 deepWaterColor = vec3(0.0, 0.2, 0.3);
  vec3 shallowWaterColor = vec3(0.3, 0.6, 0.7);
  vec3 waterColor = mix(deepWaterColor, shallowWaterColor, fresnelTerm);
  
  
  float causticsPattern = caustics(vUv + worldNormal.xz * 0.1, time);
  vec3 causticsColor = vec3(0.8, 0.9, 1.0) * causticsPattern * 0.5;
  
  
  float scattering = max(0.0, dot(worldNormal, -lightDirection)) * 0.3;
  vec3 scatterColor = vec3(0.4, 0.8, 0.9) * scattering;
  
  
  float foam = smoothstep(0.0, 0.3, abs(worldNormal.y - 1.0));
  vec3 foamColor = vec3(1.0) * foam * 0.2;
  
  
  vec3 finalColor = waterColor;
  finalColor = mix(finalColor, envColor, fresnelTerm * 0.8);
  finalColor += causticsColor;
  finalColor += scatterColor;
  finalColor += foamColor;
  
  
  vec3 halfVector = normalize(lightDirection + viewDirection);
  float specular = pow(max(dot(worldNormal, halfVector), 0.0), 64.0);
  finalColor += lightColor * specular * 0.5;
  
  
  float depth = length(vViewPosition);
  float alpha = mix(0.85, 0.95, fresnelTerm);
  
  
  float underwater = 1.0 - clamp(dot(vec3(0.0, 1.0, 0.0), viewDirection), 0.0, 1.0);
  finalColor = mix(finalColor, finalColor * vec3(0.8, 0.9, 1.0), underwater * 0.3);
  
  gl_FragColor = vec4(finalColor, alpha);
}`;class Ut{constructor(n,o,e,a){m(this,"mesh");m(this,"material");const i=new pe(o*.98,e*.98,64,64),r=this.createNormalMap(),s=this.getEnvironmentMap(n);this.material=new ne({vertexShader:Bt,fragmentShader:Ht,uniforms:{time:{value:0},normalMap:{value:r},envMap:{value:s},cameraPosition:{value:new u},lightDirection:{value:new u(.5,1,.5).normalize()},lightColor:{value:new u(1,1,.9)}},transparent:!0,side:fe,depthWrite:!1}),this.mesh=new O(i,this.material),this.mesh.rotation.x=-Math.PI/2,this.mesh.position.y=a,n.add(this.mesh)}createNormalMap(){const o=new Uint8Array(65536);for(let a=0;a<128;a++)for(let i=0;i<128;i++){const r=(a*128+i)*4,s=Math.sin(a*.1)*.5+.5,l=Math.cos(i*.1)*.5+.5,c=1;o[r]=s*255,o[r+1]=l*255,o[r+2]=c*255,o[r+3]=255}const e=new xt(o,128,128,St);return e.wrapS=oe,e.wrapT=oe,e.needsUpdate=!0,e}getEnvironmentMap(n){return n.environment}update(n,o){this.material.uniforms.time.value=n,this.material.uniforms.cameraPosition.value.copy(o)}}class qt{constructor(n,o){m(this,"group");m(this,"bubbleSystem");m(this,"dustSystem");m(this,"lightRaysSystem");this.group=new F,n.add(this.group),this.bubbleSystem=this.createBubbleSystem(o),this.dustSystem=this.createDustSystem(o),this.lightRaysSystem=this.createLightRaySystem(o),this.group.add(this.bubbleSystem.points),this.group.add(this.dustSystem.points),this.group.add(this.lightRaysSystem.points)}createBubbleSystem(n){const e=new te,a=new Float32Array(80*3),i=new Float32Array(80),r=new Float32Array(80),s=new Float32Array(80),l=new Float32Array(80),c=new u;n.getSize(c);const p=new u;n.getCenter(p);for(let f=0;f<80;f++)a[f*3]=p.x+(Math.random()-.5)*c.x*.8,a[f*3+1]=n.min.y+Math.random()*c.y,a[f*3+2]=p.z+(Math.random()-.5)*c.z*.8,i[f]=Math.random()*4+2,r[f]=Math.random()*.8+.3,s[f]=Math.random()*10,l[f]=Math.random()*Math.PI*2;e.setAttribute("position",new T(a,3)),e.setAttribute("size",new T(i,1)),e.setAttribute("speed",new T(r,1)),e.setAttribute("offset",new T(s,1)),e.setAttribute("phase",new T(l,1));const d=new ne({uniforms:{time:{value:0},color:{value:new b(.8,.9,1)}},vertexShader:`
        attribute float size;
        attribute float speed;
        attribute float offset;
        attribute float phase;
        
        varying float vAlpha;
        varying float vSize;
        
        uniform float time;
        
        void main() {
          vec3 pos = position;
          
          float totalTime = time * speed + offset;
          pos.y = mod(totalTime, 12.0) - 6.0;
          
          float wiggle = sin(totalTime * 3.0 + phase) * 0.2;
          pos.x += wiggle;
          pos.z += cos(totalTime * 2.5 + phase) * 0.15;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          vSize = size;
          gl_PointSize = size * (400.0 / -mvPosition.z);
          
          vAlpha = 1.0 - smoothstep(-4.0, 4.0, pos.y);
          vAlpha *= (0.7 + 0.3 * sin(time * 2.0 + phase));
        }
      `,fragmentShader:`
        varying float vAlpha;
        varying float vSize;
        uniform vec3 color;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * 0.8;
          
          float highlight = smoothstep(0.3, 0.1, dist);
          vec3 finalColor = color + vec3(highlight * 0.5);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,transparent:!0,blending:he,depthWrite:!1});return{points:new de(e,d),material:d,count:80}}createDustSystem(n){const e=new te,a=new Float32Array(200*3),i=new Float32Array(200),r=new Float32Array(200*3),s=new Float32Array(200),l=new u;n.getSize(l);const c=new u;n.getCenter(c);for(let d=0;d<200;d++)a[d*3]=c.x+(Math.random()-.5)*l.x,a[d*3+1]=c.y+(Math.random()-.5)*l.y,a[d*3+2]=c.z+(Math.random()-.5)*l.z,i[d]=Math.random()*1.5+.5,r[d*3]=(Math.random()-.5)*.02,r[d*3+1]=Math.random()*.01+.005,r[d*3+2]=(Math.random()-.5)*.02,s[d]=Math.random();e.setAttribute("position",new T(a,3)),e.setAttribute("size",new T(i,1)),e.setAttribute("velocity",new T(r,3)),e.setAttribute("life",new T(s,1));const p=new ne({uniforms:{time:{value:0},color:{value:new b(.9,.8,.6)}},vertexShader:`
        attribute float size;
        attribute vec3 velocity;
        attribute float life;
        
        varying float vAlpha;
        
        uniform float time;
        
        void main() {
          vec3 pos = position + velocity * time * 100.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = size * (200.0 / -mvPosition.z);
          
          vAlpha = sin(life + time * 0.5) * 0.3 + 0.2;
        }
      `,fragmentShader:`
        varying float vAlpha;
        uniform vec3 color;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,transparent:!0,blending:he,depthWrite:!1});return{points:new de(e,p),material:p,count:200}}createLightRaySystem(n){const e=new te,a=new Float32Array(50*3),i=new Float32Array(50),r=new Float32Array(50),s=new Float32Array(50),l=new u;n.getSize(l);const c=new u;n.getCenter(c);for(let d=0;d<50;d++)a[d*3]=c.x+(Math.random()-.5)*l.x*.9,a[d*3+1]=c.y+(Math.random()-.5)*l.y*.9,a[d*3+2]=c.z+(Math.random()-.5)*l.z*.9,i[d]=Math.random()*8+4,r[d]=Math.random()*.5+.3,s[d]=Math.random()*Math.PI*2;e.setAttribute("position",new T(a,3)),e.setAttribute("size",new T(i,1)),e.setAttribute("intensity",new T(r,1)),e.setAttribute("phase",new T(s,1));const p=new ne({uniforms:{time:{value:0},color:{value:new b(1,.95,.8)}},vertexShader:`
        attribute float size;
        attribute float intensity;
        attribute float phase;
        
        varying float vAlpha;
        varying float vIntensity;
        
        uniform float time;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = size * (300.0 / -mvPosition.z);
          
          vIntensity = intensity;
          vAlpha = (sin(time * 0.8 + phase) * 0.5 + 0.5) * intensity;
        }
      `,fragmentShader:`
        varying float vAlpha;
        varying float vIntensity;
        uniform vec3 color;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.4;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,transparent:!0,blending:he,depthWrite:!1});return{points:new de(e,p),material:p,count:50}}update(n){this.bubbleSystem.material.uniforms.time.value=n,this.dustSystem.material.uniforms.time.value=n,this.lightRaysSystem.material.uniforms.time.value=n}setEnabled(n){this.group.visible=n}}class Xt{constructor(n){m(this,"scene");m(this,"envMap",null);this.scene=n}async loadHDRI(){const n=this.createEnvironmentCubeMap();return this.envMap=n,this.scene.environment=n,this.scene.background=this.createGradientBackground(),n}createEnvironmentCubeMap(){const o=document.createElement("canvas");o.width=512,o.height=512;const e=o.getContext("2d"),a=[];for(let s=0;s<6;s++){const l=e.createRadialGradient(256,256,0,256,256,256);s===2?(l.addColorStop(0,"#ffffff"),l.addColorStop(.3,"#e6f2ff"),l.addColorStop(1,"#b3d9ff")):s===3?(l.addColorStop(0,"#2c3e50"),l.addColorStop(1,"#1a252f")):(l.addColorStop(0,"#34495e"),l.addColorStop(.5,"#2c3e50"),l.addColorStop(1,"#1a252f")),e.fillStyle=l,e.fillRect(0,0,512,512),e.globalCompositeOperation="screen",e.fillStyle=`rgba(106, 199, 214, ${.1+Math.random()*.1})`;for(let c=0;c<20;c++){const p=Math.random()*512,d=Math.random()*512,f=Math.random()*30+10;e.beginPath(),e.arc(p,d,f,0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over",a.push(o.toDataURL())}const r=new Ct().load(a);return r.mapping=Pt,r}createGradientBackground(){const n=document.createElement("canvas");n.width=512,n.height=512;const o=n.getContext("2d"),e=o.createLinearGradient(0,0,0,n.height);e.addColorStop(0,"#1a4d61"),e.addColorStop(.3,"#2a5f75"),e.addColorStop(.7,"#1e3a47"),e.addColorStop(1,"#0a2e3d"),o.fillStyle=e,o.fillRect(0,0,n.width,n.height);const a=new Ye(n);return a.mapping=Tt,a}getEnvironmentMap(){return this.envMap}}class Zt{constructor(n,o){m(this,"group");m(this,"plants",[]);m(this,"decorations",[]);m(this,"time",0);this.group=new F,n.add(this.group),this.createSeaweed(o),this.createCorals(o),this.createRocks(o),this.createSandDetails(o)}createSeaweed(n){const e=new u;n.getSize(e);for(let a=0;a<15;a++){const i=new F,r=(Math.random()-.5)*e.x*.7,s=(Math.random()-.5)*e.z*.7,l=n.min.y+.1;i.position.set(r,l,s);const c=2+Math.random()*3,p=Math.floor(c*3);for(let d=0;d<p;d++){const f=c/p,w=.1+(p-d)*.02,y=new Et(w*.3,w,f,6),x=.3+Math.random()*.2,P=new _({color:new b().setHSL(x,.7,.3),metalness:0,roughness:.8,transmission:.3,thickness:.1,transparent:!0,opacity:.8,side:fe}),E=new O(y,P);E.position.y=d*f+f/2,E.rotation.z=Math.sin(d*.5)*.2,E.userData={originalRotation:E.rotation.z,swayOffset:Math.random()*Math.PI*2,swayAmplitude:.1+Math.random()*.1},i.add(E)}this.plants.push(i),this.group.add(i)}}createCorals(n){const e=new u;n.getSize(e);for(let a=0;a<8;a++){const i=new F,r=(Math.random()-.5)*e.x*.6,s=(Math.random()-.5)*e.z*.6,l=n.min.y+.1;i.position.set(r,l,s);const c=3+Math.floor(Math.random()*4);for(let p=0;p<c;p++){const d=.5+Math.random()*1.5,f=.05+Math.random()*.03,w=new X(f*2,d,6),y=[new b(16739143),new b(16747625),new b(16753920),new b(16738740)],x=new _({color:y[Math.floor(Math.random()*y.length)],metalness:0,roughness:.9,clearcoat:.3,clearcoatRoughness:.8}),P=new O(w,x);P.position.y=d/2,P.rotation.x=(Math.random()-.5)*.5,P.rotation.z=(Math.random()-.5)*.5,P.rotation.y=p/c*Math.PI*2+Math.random()*.5,i.add(P)}this.decorations.push(i),this.group.add(i)}}createRocks(n){const e=new u;n.getSize(e);for(let a=0;a<12;a++){const i=.3+Math.random()*.8,r=new zt(i),s=r.getAttribute("position");for(let w=0;w<s.count;w++){const y=new u;y.fromBufferAttribute(s,w);const x=(Math.random()-.5)*.3;y.multiplyScalar(1+x),s.setXYZ(w,y.x,y.y,y.z)}r.computeVertexNormals();const l=new _({color:new b().setHSL(.1+Math.random()*.1,.2+Math.random()*.3,.2+Math.random()*.3),metalness:.1,roughness:.9,bumpScale:.5}),c=new O(r,l),p=(Math.random()-.5)*e.x*.8,d=(Math.random()-.5)*e.z*.8,f=n.min.y+i*.3;c.position.set(p,f,d),c.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI),c.receiveShadow=!0,this.decorations.push(new F().add(c)),this.group.add(c)}}createSandDetails(n){const o=new pe(1,.1,10,1),e=new _({color:15259064,metalness:0,roughness:1,transparent:!0,opacity:.3});for(let a=0;a<20;a++){const i=new O(o,e);i.rotation.x=-Math.PI/2,i.rotation.z=Math.random()*Math.PI;const r=new u;n.getSize(r),i.position.set((Math.random()-.5)*r.x*.9,n.min.y+.01,(Math.random()-.5)*r.z*.9);const s=.5+Math.random()*2;i.scale.set(s,1,s),this.group.add(i)}}update(n){this.time=n,this.plants.forEach(o=>{o.children.forEach((e,a)=>{if(e.userData.originalRotation!==void 0){const i=e.userData.swayOffset||0,r=e.userData.swayAmplitude||.1,s=Math.sin(this.time*.8+i+a*.3)*r;e.rotation.z=e.userData.originalRotation+s,e.rotation.x=Math.sin(this.time*.5+i)*.05}})})}setMotionEnabled(n){this.plants.forEach(o=>{o.children.forEach(e=>{!n&&e.userData.originalRotation!==void 0&&(e.rotation.z=e.userData.originalRotation,e.rotation.x=0)})})}}class Kt{constructor(n){m(this,"scene");m(this,"camera");m(this,"renderer");m(this,"controls");m(this,"clock");m(this,"tank");m(this,"fishSystem",null);m(this,"waterSurface",null);m(this,"particleSystem",null);m(this,"aquascaping",null);m(this,"environmentLoader");m(this,"animationId",null);m(this,"motionEnabled",!0);m(this,"animate",()=>{if(!this.motionEnabled){this.animationId=requestAnimationFrame(this.animate);return}this.animationId=requestAnimationFrame(this.animate);const n=this.clock.getDelta(),o=this.clock.getElapsedTime();this.controls.update(),this.fishSystem&&this.fishSystem.update(n,o),this.waterSurface&&this.waterSurface.update(o,this.camera.position),this.particleSystem&&this.particleSystem.update(o),this.aquascaping&&this.aquascaping.update(o),this.renderer.render(this.scene,this.camera)});m(this,"handleResize",()=>{this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight)});this.scene=new At,this.clock=new kt,this.camera=new Dt(35,window.innerWidth/window.innerHeight,.1,1e3),this.camera.position.set(0,0,25),this.renderer=new Lt({antialias:!0,alpha:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.toneMapping=Rt,this.renderer.toneMappingExposure=1,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Ot,this.renderer.outputColorSpace=It,n.appendChild(this.renderer.domElement),this.controls=new Vt(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.dampingFactor=.02,this.controls.minDistance=15,this.controls.maxDistance=50,this.controls.maxPolarAngle=Math.PI*.6,this.controls.minPolarAngle=Math.PI*.2,this.controls.enablePan=!1,this.tank=new F,this.scene.add(this.tank),this.environmentLoader=new Xt(this.scene),this.init()}async init(){await this.environmentLoader.loadHDRI(),this.setupLighting(),this.createTank(),this.createAquascaping(),this.createFishSystem(),this.createWaterEffects(),this.setupEventListeners()}setupLighting(){const n=new Ft(6997974,.4);this.scene.add(n);const o=new Nt(16777215,.8);o.position.set(5,10,5),o.castShadow=!0,o.shadow.camera.near=.1,o.shadow.camera.far=50,o.shadow.camera.left=-10,o.shadow.camera.right=10,o.shadow.camera.top=10,o.shadow.camera.bottom=-10,o.shadow.mapSize.width=2048,o.shadow.mapSize.height=2048,this.scene.add(o);const e=new Ne(6997974,.5,20);e.position.set(-5,3,-5),this.scene.add(e);const a=new Ne(4890290,.5,20);a.position.set(5,3,5),this.scene.add(a)}createTank(){const i=this.environmentLoader.getEnvironmentMap(),r=new _({color:16777215,metalness:0,roughness:.02,transmission:.98,thickness:.1*10,transparent:!0,opacity:.1,reflectivity:.8,ior:1.52,envMap:i,envMapIntensity:1.5,clearcoat:1,clearcoatRoughness:.1,side:fe}),s=new je(20,12,16,1,1,1),l=new O(s,r);l.castShadow=!0,l.receiveShadow=!0,this.tank.add(l);const c=new je(20-.1*2,.2,16-.1*2),p=new Ge({color:2772314,roughness:.8,metalness:.1}),d=new O(c,p);d.position.y=-12/2+.1,d.receiveShadow=!0,this.tank.add(d);const f=new pe(20-.1*2,16-.1*2),w=new Ge({color:15259064,roughness:1,metalness:0,normalScale:new A(.5,.5)}),y=new O(f,w);y.rotation.x=-Math.PI/2,y.position.y=-12/2+.21,y.receiveShadow=!0,this.tank.add(y)}createAquascaping(){const n=new me(new u(-9.5,-5.5,-7.5),new u(9.5,5.5,7.5));this.aquascaping=new Zt(this.scene,n)}createFishSystem(){const n=new me(new u(-9.5,-5.5,-7.5),new u(9.5,5.5,7.5));this.fishSystem=new Yt(this.scene,n)}createWaterEffects(){this.waterSurface=new Ut(this.scene,20,16,5.8);const n=new me(new u(-9.5,-5.5,-7.5),new u(9.5,5.5,7.5));this.particleSystem=new qt(this.scene,n)}start(){this.animate()}stop(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}setMotionEnabled(n){this.motionEnabled=n,this.fishSystem&&this.fishSystem.setMotionEnabled(n),this.particleSystem&&this.particleSystem.setEnabled(n),this.aquascaping&&this.aquascaping.setMotionEnabled(n)}setupEventListeners(){window.addEventListener("resize",this.handleResize)}dispose(){this.stop(),window.removeEventListener("resize",this.handleResize),this.renderer.dispose(),this.controls.dispose()}}class Qt{constructor(){m(this,"audioContext",null);m(this,"masterGain",null);m(this,"isEnabled",!1);this.setupAudioContext(),this.createWaterAmbient()}setupAudioContext(){try{this.audioContext=new(window.AudioContext||window.webkitAudioContext),this.masterGain=this.audioContext.createGain(),this.masterGain.connect(this.audioContext.destination),this.masterGain.gain.setValueAtTime(.2,this.audioContext.currentTime)}catch(n){console.warn("Web Audio API not supported:",n)}}createWaterAmbient(){if(!this.audioContext||!this.masterGain)return;const n=this.audioContext.sampleRate*4,o=this.audioContext.createBuffer(2,n,this.audioContext.sampleRate);for(let c=0;c<o.numberOfChannels;c++){const p=o.getChannelData(c);let d=0;for(let f=0;f<n;f++){const w=Math.random()*2-1,y=(d+.02*w)/1.02;d=y,p[f]=y*.1}}const e=this.audioContext.createBufferSource();e.buffer=o,e.loop=!0;const a=this.audioContext.createBiquadFilter();a.type="lowpass",a.frequency.setValueAtTime(800,this.audioContext.currentTime),a.Q.setValueAtTime(1,this.audioContext.currentTime);const i=this.audioContext.createBiquadFilter();i.type="highpass",i.frequency.setValueAtTime(100,this.audioContext.currentTime);const r=this.audioContext.createConvolver();r.buffer=this.createReverbBuffer();const s=this.audioContext.createGain(),l=this.audioContext.createGain();s.gain.setValueAtTime(.8,this.audioContext.currentTime),l.gain.setValueAtTime(.2,this.audioContext.currentTime),e.connect(a),a.connect(i),i.connect(s),s.connect(this.masterGain),i.connect(r),r.connect(l),l.connect(this.masterGain),e.start(0)}createReverbBuffer(){if(!this.audioContext)throw new Error("AudioContext not available");const n=this.audioContext.sampleRate,o=n*2,e=this.audioContext.createBuffer(2,o,n);for(let a=0;a<e.numberOfChannels;a++){const i=e.getChannelData(a);for(let r=0;r<o;r++){const s=Math.pow(1-r/o,2);i[r]=(Math.random()*2-1)*s*.1}}return e}setEnabled(n){this.isEnabled=n,!(!this.audioContext||!this.masterGain)&&(n?(this.audioContext.state==="suspended"&&this.audioContext.resume(),this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime),this.masterGain.gain.setValueAtTime(0,this.audioContext.currentTime),this.masterGain.gain.linearRampToValueAtTime(.2,this.audioContext.currentTime+1)):(this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime),this.masterGain.gain.setValueAtTime(this.masterGain.gain.value,this.audioContext.currentTime),this.masterGain.gain.linearRampToValueAtTime(0,this.audioContext.currentTime+.5)))}setVolume(n){if(!this.audioContext||!this.masterGain)return;const o=Math.max(0,Math.min(1,n));this.masterGain.gain.setValueAtTime(o*.2,this.audioContext.currentTime)}playBubbleSound(){if(!this.audioContext||!this.isEnabled)return;const n=this.audioContext.createOscillator(),o=this.audioContext.createGain();n.type="sine",n.frequency.setValueAtTime(800,this.audioContext.currentTime),n.frequency.exponentialRampToValueAtTime(400,this.audioContext.currentTime+.1),o.gain.setValueAtTime(.05,this.audioContext.currentTime),o.gain.exponentialRampToValueAtTime(.001,this.audioContext.currentTime+.1),n.connect(o),o.connect(this.masterGain),n.start(this.audioContext.currentTime),n.stop(this.audioContext.currentTime+.1)}playFishSwimSound(){if(!this.audioContext||!this.isEnabled)return;const n=this.audioContext.createOscillator(),o=this.audioContext.createGain(),e=this.audioContext.createBiquadFilter();n.type="sawtooth",n.frequency.setValueAtTime(60,this.audioContext.currentTime),e.type="lowpass",e.frequency.setValueAtTime(200,this.audioContext.currentTime),o.gain.setValueAtTime(.01,this.audioContext.currentTime),o.gain.exponentialRampToValueAtTime(.001,this.audioContext.currentTime+.3),n.connect(e),e.connect(o),o.connect(this.masterGain),n.start(this.audioContext.currentTime),n.stop(this.audioContext.currentTime+.3)}dispose(){this.audioContext&&(this.audioContext.close(),this.audioContext=null)}}class $t{constructor(){m(this,"scene",null);m(this,"audioManager");m(this,"motionToggle");m(this,"soundToggle");m(this,"prefersReducedMotion");this.audioManager=new Qt,this.motionToggle=document.getElementById("motion-toggle"),this.soundToggle=document.getElementById("sound-toggle"),this.prefersReducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches,this.init()}async init(){this.showLoadingScreen(),await this.loadAssets();const n=document.getElementById("canvas-container");n&&(this.scene=new Kt(n),this.setupEventListeners(),this.prefersReducedMotion&&(this.motionToggle.checked=!1,this.scene.setMotionEnabled(!1)),this.scene.start(),setTimeout(()=>{this.hideLoadingScreen()},2e3))}showLoadingScreen(){const n=document.getElementById("lottie-bubbles");if(!n)return;const o={container:n,renderer:"svg",loop:!0,autoplay:!0,animationData:{v:"5.5.7",fr:30,ip:0,op:60,w:200,h:200,nm:"Bubbles",ddd:0,assets:[],layers:[{ddd:0,ind:1,ty:4,nm:"Bubble 1",sr:1,ks:{o:{a:0,k:100},r:{a:0,k:0},p:{a:1,k:[{i:{x:.5,y:1},o:{x:.5,y:0},t:0,s:[100,180,0],to:[0,-30,0],ti:[0,30,0]},{t:60,s:[100,20,0]}]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},ao:0,shapes:[{ty:"gr",it:[{ind:0,ty:"el",s:{a:0,k:[20,20]},p:{a:0,k:[0,0]}},{ty:"st",c:{a:0,k:[.42,.78,.84,1]},o:{a:0,k:100},w:{a:0,k:2}},{ty:"fl",c:{a:0,k:[.42,.78,.84,.3]},o:{a:0,k:30}},{ty:"tr",p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100}}]}],ip:0,op:60,st:0}]}};jt.loadAnimation(o)}hideLoadingScreen(){const n=document.getElementById("loading-screen");n&&(n.style.transition="opacity 0.5s",n.style.opacity="0",setTimeout(()=>{n.style.display="none"},500))}async loadAssets(){return new Promise(n=>{setTimeout(n,1e3)})}setupEventListeners(){this.motionToggle.addEventListener("change",()=>{this.scene&&this.scene.setMotionEnabled(this.motionToggle.checked)}),this.soundToggle.addEventListener("change",()=>{this.audioManager.setEnabled(this.soundToggle.checked)}),window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",n=>{n.matches&&(this.motionToggle.checked=!1,this.scene&&this.scene.setMotionEnabled(!1))})}}document.addEventListener("DOMContentLoaded",()=>{new $t});
