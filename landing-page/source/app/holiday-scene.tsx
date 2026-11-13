export default function HolidayScene() {
 return <div className="holiday-scene">
  <div className="scene-caption"><span className="scene-dot"/> LA FLORIDA, EN FAMILIA <span>✳</span></div>
  <div className="scene-type" aria-hidden="true">Celebremos<br/><em>juntos.</em></div>
  <svg className="holiday-art" viewBox="0 0 600 600" role="img" aria-label="Regalos de Navidad con cintas doradas, esferas y estrellas sobre un fondo verde">
   <defs>
    <linearGradient id="red-box" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ee997d"/><stop offset="1" stopColor="#c45942"/></linearGradient>
    <linearGradient id="red-side" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#a73f31"/><stop offset="1" stopColor="#c9614c"/></linearGradient>
    <linearGradient id="gold-ribbon" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff1c2"/><stop offset=".48" stopColor="#e8c27a"/><stop offset="1" stopColor="#c89447"/></linearGradient>
    <linearGradient id="cream-box" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fbf1d8"/><stop offset="1" stopColor="#d5c7a3"/></linearGradient>
    <radialGradient id="bauble" cx=".3" cy=".25" r=".8"><stop stopColor="#f7d79a"/><stop offset=".5" stopColor="#d9a757"/><stop offset="1" stopColor="#9d7135"/></radialGradient>
    <radialGradient id="red-bauble" cx=".28" cy=".25" r=".8"><stop stopColor="#f3b398"/><stop offset=".5" stopColor="#dc7e61"/><stop offset="1" stopColor="#984331"/></radialGradient>
    <filter id="present-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
    <pattern id="paper-dots" width="21" height="21" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="1.2" fill="#fff6dc" opacity=".28"/></pattern>
   </defs>
   <circle cx="302" cy="300" r="228" fill="none" stroke="#d5d9bb" strokeOpacity=".12"/>
   <circle cx="302" cy="300" r="193" fill="none" stroke="#d5d9bb" strokeOpacity=".08"/>
   <path d="M452 0v137M126 0v224" stroke="#ddc798" strokeOpacity=".6"/>
   <path d="M444 137h16v12h-16z" fill="#b89551"/><circle cx="452" cy="186" r="43" fill="url(#bauble)"/><ellipse cx="435" cy="167" rx="8" ry="12" transform="rotate(35 435 167)" fill="#fff8df" opacity=".27"/>
   <path d="M119 222h14v10h-14z" fill="#b89551"/><circle cx="126" cy="262" r="35" fill="url(#red-bauble)"/>
   <path d="m507 279 7 18 19 7-19 7-7 18-7-18-19-7 19-7zM186 132l5 14 15 5-15 5-5 14-5-14-15-5 15-5z" fill="#e5c68e"/>
   <g fill="#e1d9b7"><circle cx="80" cy="344" r="2"/><circle cx="355" cy="109" r="2"/><circle cx="527" cy="399" r="3"/><circle cx="211" cy="205" r="2"/></g>
   <ellipse cx="310" cy="500" rx="169" ry="22" fill="#061f1a" opacity=".5" filter="url(#present-shadow)"/>
   <g transform="rotate(-9 300 380)">
    <path d="m192 297 171-29 87 59-171 33z" fill="#efab8f"/>
    <path d="m279 360 171-33v145l-171 34z" fill="url(#red-box)"/>
    <path d="m192 297 87 63v146l-87-66z" fill="url(#red-side)"/>
    <path d="m279 360 171-33v145l-171 34z" fill="url(#paper-dots)"/>
    <path d="m186 290 179-32 93 63-180 36z" fill="#f0a98c"/>
    <path d="m278 357 180-36v22l-180 36z" fill="#db7d61"/>
    <path d="m186 290 92 67v22l-92-67z" fill="#b85843"/>
    <path d="m261 276 26-4 93 64-27 5z" fill="url(#gold-ribbon)"/>
    <path d="m353 341 27-5v149l-27 6z" fill="url(#gold-ribbon)"/>
    <path d="m224 317 171-32 19 13-171 34z" fill="#ffe7ab"/>
    <path d="m224 317 19 15v146l-19-15z" fill="#dfb26b"/>
    <path d="M313 302c-84-13-89-70-57-65 28 4 43 32 57 65Z" fill="none" stroke="#f9dca0" strokeWidth="13"/>
    <path d="M313 302c4-72 60-94 63-58 3 26-31 46-63 58Z" fill="none" stroke="#e9c07a" strokeWidth="13"/>
    <path d="m310 298 15-5 7 12-14 10-13-5z" fill="#ffe9b2"/>
    <path d="m317 310-13 32 20-5 12 6-4-40" fill="#f9dca0"/>
   </g>
   <g transform="rotate(10 187 452)">
    <path d="m113 422 97-20 54 35-97 22z" fill="#fff4d9"/>
    <path d="m167 459 97-22v70l-97 23z" fill="url(#cream-box)"/>
    <path d="m113 422 54 37v71l-54-39z" fill="#bcae8e"/>
    <path d="m108 416 103-21 59 36-103 24z" fill="#fff2d4"/>
    <path d="m167 455 103-24v13l-103 24z" fill="#dfd2b4"/>
    <path d="m150 406 18-4 58 38-19 5zM207 445l19-5v76l-19 5z" fill="#446753"/>
    <path d="M184 421c-32-46-60-37-47-17 8 11 24 15 47 17Zm0 0c8-49 41-52 35-27-3 14-18 20-35 27Z" fill="none" stroke="#597a60" strokeWidth="8"/>
   </g>
   <path d="M411 484q41-33 64-82M423 472q19 4 35-5M438 453q-9-14-5-27M451 433q18 5 30-4M463 414q-6-13-2-23" fill="none" stroke="#9aaf88" strokeWidth="3" strokeLinecap="round"/>
   <path d="m359 531 5 12 13 5-13 5-5 12-5-12-13-5 13-5z" fill="#edcf95"/>
  </svg>
  <div className="scene-bottom"><HeartMark/><span>Pequeños momentos.<br/><strong>Grandes recuerdos.</strong></span><span className="scene-bottom-star">✧</span></div>
 </div>;
}
function HeartMark(){return <span className="scene-heart"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></span>}
