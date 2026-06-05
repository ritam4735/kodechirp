'use client';
import { useEffect } from 'react';

export default function BgUniverse() {
  useEffect(() => {
    const sf = document.getElementById('starField');
    if (sf && sf.childElementCount === 0) {
      for (let i = 0; i < 200; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        const size = Math.random() * 2.5 + 0.5;
        s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${2+Math.random()*4}s;--delay:${Math.random()*5}s;opacity:${0.2+Math.random()*0.6};`;
        sf.appendChild(s);
      }
    }
    const bc = document.getElementById('bubblesContainer');
    if (bc && bc.childElementCount === 0) {
      [
        {size:80,left:8,top:30,dur:10},{size:50,left:15,top:65,dur:14},
        {size:30,left:5,top:75,dur:8},{size:65,left:88,top:40,dur:12},
        {size:40,left:92,top:70,dur:16},{size:25,left:82,top:25,dur:11},
        {size:55,left:45,top:15,dur:9},{size:35,left:72,top:85,dur:13},
        {size:20,left:30,top:90,dur:7},{size:45,left:60,top:78,dur:15},
      ].forEach((b, i) => {
        const el = document.createElement('div');
        el.className = 'bubble';
        el.style.cssText = `width:${b.size}px;height:${b.size}px;left:${b.left}%;top:${b.top}%;--dur:${b.dur}s;--delay:${i*0.8}s;`;
        bc.appendChild(el);
      });
    }
  }, []);

  return (
    <>
      <div className="bg-universe">
        <div className="bg-gradient-mesh"></div>
        <div className="star-field" id="starField"></div>
        <div className="nebula nebula-1"></div>
        <div className="nebula nebula-2"></div>
        <div className="nebula nebula-3"></div>
        <svg className="mountain-silhouette" viewBox="0 0 1440 280" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,280 L0,200 L80,180 L140,150 L200,160 L280,100 L360,130 L420,80 L500,110 L560,60 L620,90 L680,50 L740,80 L800,40 L860,70 L920,30 L980,60 L1040,90 L1100,55 L1160,85 L1220,120 L1280,140 L1360,160 L1440,150 L1440,280 Z" fill="rgba(10,15,50,0.6)" />
          <path d="M0,280 L0,230 L60,220 L120,200 L200,210 L280,170 L350,185 L420,145 L500,160 L580,130 L640,150 L720,110 L800,130 L880,105 L940,120 L1020,90 L1100,110 L1180,140 L1260,160 L1360,175 L1440,165 L1440,280 Z" fill="rgba(5,8,25,0.7)" />
        </svg>
        <div className="water-reflection"></div>
      </div>
      <div className="bubbles-container" id="bubblesContainer"></div>
    </>
  );
}
