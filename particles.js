!function(){
  var c = document.getElementById('particle-canvas');
  if(!c) return;
  var ctx = c.getContext('2d'),
      w, h, mouse = {x: null, y: null},
      particles = [],
      N = 120,
      linkDist = 180,
      mouseDist = 200;

  function resize(){
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', function(e){
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseout', function(){
    mouse.x = null;
    mouse.y = null;
  });

  for(var i = 0; i < N; i++){
    particles.push({
      x: Math.random()*w,
      y: Math.random()*h,
      vx: (Math.random()-0.5)*0.8,
      vy: (Math.random()-0.5)*0.8,
      r: Math.random()*2+1
    });
  }

  function loop(){
    if(document.hidden){ requestAnimationFrame(loop); return; }
    ctx.clearRect(0,0,w,h);

    for(var i=0;i<N;i++){
      var p=particles[i];

      // mouse attraction
      if(mouse.x !== null){
        var dx=mouse.x-p.x, dy=mouse.y-p.y,
            d=Math.sqrt(dx*dx+dy*dy);
        if(d<mouseDist){
          p.x += dx*0.02;
          p.y += dy*0.02;
        }
      }

      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0){p.x=0;p.vx*=-1}
      if(p.x>w){p.x=w;p.vx*=-1}
      if(p.y<0){p.y=0;p.vy*=-1}
      if(p.y>h){p.y=h;p.vy*=-1}

      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(180,200,230,0.7)';
      ctx.fill();

      for(var j=i+1;j<N;j++){
        var q=particles[j],
            ex=p.x-q.x, ey=p.y-q.y,
            dist=Math.sqrt(ex*ex+ey*ey);
        if(dist<linkDist){
          var alpha=(1-dist/linkDist)*0.7;
          ctx.beginPath();
          ctx.moveTo(p.x,p.y);
          ctx.lineTo(q.x,q.y);
          ctx.strokeStyle='rgba(100,160,255,'+alpha+')';
          ctx.lineWidth=1.2;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
}();
