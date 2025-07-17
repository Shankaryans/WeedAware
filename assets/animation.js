
    const scene = new THREE.Scene();
    scene.background = null;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: document.getElementById('three-canvas'), 
      antialias: true,
      alpha: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0);

    let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    const zoom = 20;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const loader = new THREE.GLTFLoader();
    let mixer;

    loader.load('assets/Animation.glb', function (gltf) {
      scene.add(gltf.scene);

      gltf.scene.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      if (gltf.cameras && gltf.cameras.length > 0) {
        camera = gltf.cameras[0];
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        camera.position.add(forward.multiplyScalar(zoom * 10));
      } else {
        camera.position.set(0, 2, 5 * zoom);
      }

      mixer = new THREE.AnimationMixer(gltf.scene);
      const fps = 24;
      const animations = gltf.animations;
      const findAnim = name => animations.find(a => a.name === name);

      const model_1 = findAnim('Right_Brain');
      const model_2 = findAnim('Left_Brain');
      const clipRight = THREE.AnimationUtils.subclip(model_1, 'clipRight', 0, 50, fps);
      const clipLeft = THREE.AnimationUtils.subclip(model_2, 'clipLeft', 0, 50, fps);

      const names = [
        'Flask11','Flask13','Flask12','Flask21','Flask22','Flask23','Flask24','Flask31','Flask32','Flask33',
        'Weed11','Weed12','Weed13','Weed21','Weed22','Weed23',
        'Carbon_Bond11','Carbon_Bond12','Carbon_Bond13','Carbon_Bond14',
        'Carbon_Bond21','Carbon_Bond22','Carbon_Bond23','Carbon_Bond24'
      ];

      const actions = [];
      actions.push(mixer.clipAction(clipRight));
      actions.push(mixer.clipAction(clipLeft));

      for(let i = 0; i < names.length; i++) {
        const clip = findAnim(names[i]);
        if(clip) actions.push(mixer.clipAction(clip));
        else console.warn('Animation clip missing:', names[i]);
      }

      actions[0].setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
      actions[1].setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;

      for(let i = 2; i < actions.length; i++) {
        actions[i].setLoop(THREE.LoopRepeat, Infinity);
      }

      const speed_variable = 0.5;
      actions.forEach(action => action.timeScale = speed_variable);

      const delay = 2;
      actions[0].play();
      actions[1].play();

      let delays = [0,5,7,0,2,4,7,0,3,6,0,4,7,2,4,7,0,2,4,7,0,3,5,7];
      for(let i = 2; i < actions.length; i++) {
        const startDelay = delay + (delays[i - 2] || 0);
        actions[i].reset().startAt(startDelay).play();
      }
    }, undefined, function(error){
      console.error('Error loading GLB:', error);
    });

    const stats = new Stats();
    document.body.appendChild(stats.dom);

    // Mouse-controlled camera rotation (inverse direction)
    const maxAngle = Math.PI / 20;
    let targetRotationX = 0;
    let targetRotationY = 0;

    document.addEventListener('mousemove', (event) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const mouseX = (event.clientX - centerX) / centerX;
      const mouseY = (event.clientY - centerY) / centerY;

      targetRotationY = THREE.MathUtils.clamp(-mouseX * maxAngle, -maxAngle, maxAngle);
      targetRotationX = THREE.MathUtils.clamp(-mouseY * maxAngle, -maxAngle, maxAngle);
    });

    // Reset when mouse leaves window
    document.addEventListener('mouseleave', () => {
      targetRotationX = 0;
      targetRotationY = 0;
    });

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);

      // Smoothly interpolate camera rotation
      camera.rotation.x += (targetRotationX - camera.rotation.x) * 0.05;
      camera.rotation.y += (targetRotationY - camera.rotation.y) * 0.05;

      renderer.render(scene, camera);
      stats.update();
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
