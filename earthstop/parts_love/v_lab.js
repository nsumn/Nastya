// face lab for the heroine: index_love.html?debug=face&i=N renders variant N (portrait close-up)
if (DEBUG === 'face') { const V = [{ headMesh: 'head_f' }, { headMesh: 'head_kr', hairStyle: 'bangs' }, { headMesh: undefined, eyeS: 1.15 }, { headMesh: 'head_chubby', eyeS: 1.1 }, { headMesh: 'head_kr', eyeS: 1.25 }];
  const i = +(new URLSearchParams(location.search).get('i') || 0); const P = makeBlock({ ...HER_O, ...V[i] }); STR.sc.add(P.outer);
  window.renderAt = () => { hideCast(); setState(20, 'str', {}); poseReset(P, 1); place(P, HX + 0.1, 4, Math.PI / 2 - 0.35, SW); P.face('happy', 1); const h = H_(P); const c = STR.cam; c.position.set(h.x + 2.0, h.y + 0.02, h.z + 0.25); c.lookAt(h.x, h.y - 0.12, h.z); c.fov = 26; c.updateProjectionMatrix();
    document.querySelectorAll('.txt').forEach(e => e.style.opacity = 0); shootTo(RTA, STR.sc, c); compMat.uniforms.tA.value = RTA.texture; compMat.uniforms.uLook.value = 0.12; composite(0, 1, 1); return true; }; }
