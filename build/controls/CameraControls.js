import { MOUSE, TOUCH, Vector3, Quaternion, Spherical, Raycaster, Vector2, Mesh, Clock, MeshNormalMaterial, VectorKeyframeTrack, AnimationClip, AnimationMixer, InterpolateSmooth, CapsuleBufferGeometry } from 'three';
import { ControlsCamera } from 'io-gui-three-controls';
// This set of controls performs orbiting and dollying (zooming).
// Unlike TrackballControls, it maintains the "up" direction camera.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
// so camera.up is the orbit axis
const _unitY = new Vector3(0, 1, 0);
const _quat = new Quaternion();
const _quatInverse = new Quaternion();
const _offset = new Vector3();
const _movement = new Vector3();
const _delta = new Vector3();
const clock = new Clock();
let _debounce;
const raycaster = new Raycaster();
raycaster.layers.set(1);
class CameraControls extends ControlsCamera {
    // Public API
    // How far you can dolly in and out (PerspectiveCamera only)
    minDistance = 2;
    maxDistance = 100;
    constraintDistance = 20;
    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    minPolarAngle = 0;
    maxPolarAngle = Math.PI;
    // How far you can orbit horizontally, upper and lower limits.
    // If set, the interval [min, max] must be a sub-interval of [- 2 PI, 2 PI], with (max - min < 2 PI)
    minAzimuthAngle = -Infinity;
    maxAzimuthAngle = Infinity;
    // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
    // Set to false to disable zooming
    enableZoom = true;
    zoomSpeed = 3;
    // Set to false to disable rotating
    enableRotate = true;
    rotateSpeed = 3;
    // Mouse buttons
    mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    // Touch fingers // TODO: deprecate touches.ONE
    touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
    // Internal utility variables
    _spherical = new Spherical();
    _interacting = false;
    _animating = false;
    _constrained = false;
    envelope = new Mesh(new CapsuleBufferGeometry(15, 35, 32, 256), new MeshNormalMaterial());
    envelopeIntersect = new Vector3();
    envelopeNormal = new Vector3();
    mixer;
    animationClip;
    animationAction;
    _animCameraPosition = new Vector3();
    _animCameraTarget = new Vector3();
    constructor(camera, domElement) {
        super(camera, domElement);
        this.envelope.scale.z = 1.6;
        this.envelope.scale.x = 0.9;
        this.envelope.rotation.z = 0.1;
        this.envelope.updateMatrix();
        this.envelope.geometry.applyMatrix4(this.envelope.matrix);
        // this.envelope.geometry.un
        this.envelope.scale.z = 1;
        this.envelope.scale.x = 1;
        this.envelope.rotation.z = 0;
        this.envelope.material.wireframe = true;
        // this.envelope.material.transparent = true;
        // this.envelope.material.opacity = 0;
        // this.add(this.envelope);
        this.camera.lookAt(this.position);
        this.observeProperty('_constrained');
        this._animation = this._animation.bind(this);
        this._animationFinished = this._animationFinished.bind(this);
        this._checkConstraintDistance = this._checkConstraintDistance.bind(this);
        this._updateConstraints();
        this._checkConstraintDistance();
        this.mixer = new AnimationMixer(this);
        this.mixer.addEventListener('finished', this._animationFinished);
        // this._marker1 = new Mesh(new SphereBufferGeometry(0.4), new MeshNormalMaterial());
        // this.add(this._marker1);
        // this._marker2 = new Mesh(new SphereBufferGeometry(0.4), new MeshNormalMaterial());
        // this.add(this._marker2);
        // this._marker3 = new Mesh(new SphereBufferGeometry(0.4), new MeshNormalMaterial());
        // this.add(this._marker3);
        // this._marker4 = new Mesh(new SphereBufferGeometry(0.4), new MeshNormalMaterial());
        // this.add(this._marker4);
        const positionKF = new VectorKeyframeTrack('._animCameraPosition', [0, 0.5], [0, 0, 0, 0, 0, 0], InterpolateSmooth);
        const targetKF = new VectorKeyframeTrack('._animCameraTarget', [0, .25], [0, 0, 0, 0, 0, 0], InterpolateSmooth);
        this.animationClip = new AnimationClip('Action', 0.5, [positionKF, targetKF]);
        this.animationAction = this.mixer.clipAction(this.animationClip);
        this.animationAction.repetitions = 1;
        this.animationAction.clampWhenFinished = true;
    }
    // Event handlers
    _onContextMenu(event) {
        super._onContextMenu(event);
        event.preventDefault();
    }
    _onWheel(event) {
        super._onWheel(event);
        // TODO: test with inerial movement
        if (this.enableZoom === false)
            return;
        if (this._animating === true)
            return;
        event.preventDefault();
        event.stopPropagation();
        this._updateConstraints();
        if (this._constrained) {
            this._applyDollyMovementConstrained(event.deltaY);
        }
        else {
            this._applyDollyMovement(event.deltaY);
        }
        clearTimeout(_debounce);
        _debounce = setTimeout(this._checkConstraintDistance, 200);
    }
    // Tracked pointer handlers
    onTrackedPointerDown(pointer, pointers) {
        if (this._animating === true)
            return;
        if (pointers.length === 1) {
            this.dispatchEvent({ type: 'start' });
            // this.saveCameraState();
        }
    }
    onTrackedPointerMove(pointer, pointers, center) {
        if (this._animating === true)
            return;
        let button = -1;
        this._interacting = !pointer.isSimulated;
        switch (pointers.length) {
            case 1: // 1 pointer
                switch (pointer.button) {
                    case 0:
                        button = this.mouseButtons.LEFT;
                        break;
                    case 1:
                        button = this.mouseButtons.MIDDLE;
                        break;
                    case 2:
                        button = this.mouseButtons.RIGHT;
                        break;
                }
                if (button === MOUSE.ROTATE) {
                    if (this.enableRotate)
                        this._pointerRotate(pointer);
                }
                else if (button === MOUSE.DOLLY) {
                    if (this.enableZoom)
                        this._pointerDolly(pointer);
                }
                break;
            default: // 2 or more pointers
                switch (this.touches.TWO) {
                    case TOUCH.DOLLY_PAN:
                        if (this.enableZoom)
                            this._twoPointerDolly(pointers);
                        break;
                    case TOUCH.DOLLY_ROTATE:
                        if (this.enableZoom)
                            this._twoPointerDolly(pointers);
                        if (this.enableRotate)
                            this._pointerRotate(center);
                        break;
                }
        }
    }
    onTrackedPointerUp(pointer, pointers) {
        if (this._animating === true)
            return;
        if (pointers.length === 0) {
            this.dispatchEvent({ type: 'end' });
            this._interacting = false;
            this._checkConstraintDistance();
        }
    }
    _pointerDolly(pointer) {
        this._updateConstraints();
        if (this._constrained) {
            this._applyDollyMovementConstrained(pointer.view.movement.y * 1000);
        }
        else {
            this._applyDollyMovement(pointer.view.movement.y * 1000);
        }
    }
    _twoPointerDolly(pointers) {
        this.updateMatrixWorld();
        this._plane.setFromNormalAndCoplanarPoint(this.eye, this.position);
        const dist0 = pointers[0].projectOnPlane(this._plane).current.distanceTo(pointers[1].projectOnPlane(this._plane).current);
        const dist1 = pointers[0].projectOnPlane(this._plane).previous.distanceTo(pointers[1].projectOnPlane(this._plane).previous);
        this._updateConstraints();
        if (this._constrained) {
            this._applyDollyMovementConstrained(dist0 - dist1);
        }
        else {
            this._applyDollyMovement(dist0 - dist1);
        }
    }
    _pointerRotate(pointer) {
        const aspect = this.domElement.clientWidth / this.domElement.clientHeight;
        _movement.set(pointer.view.movement.x, pointer.view.movement.y, 0).multiplyScalar(this.rotateSpeed);
        _movement.x *= aspect;
        this._updateConstraints();
        if (this._constrained) {
            this._applyRotateMovementConstrained(_movement);
        }
        else {
            this._applyRotateMovement(_movement);
        }
    }
    _applyDollyMovement(dollyMovement) {
        const scale = Math.pow(1 - dollyMovement / this.domElement.clientHeight, this.zoomSpeed);
        _offset.copy(this.camera.position).sub(this.position);
        // angle from z-axis around y-axis
        this._spherical.setFromVector3(_offset);
        // restrict radius to be between desired limits
        const length = _delta.copy(this.envelopeIntersect).sub(this.position).length();
        this._spherical.radius = Math.max(length + this.minDistance, Math.min(length + this.maxDistance, this._spherical.radius * scale));
        // move target to panned location
        _offset.setFromSpherical(this._spherical);
        this.camera.position.copy(this.position).add(_offset);
        this.camera.lookAt(this.position);
        this.dispatchEvent({ type: 'change' });
    }
    _applyDollyMovementConstrained(dollyMovement) {
        const scale = Math.pow(1 - dollyMovement / this.domElement.clientHeight, this.zoomSpeed);
        _offset.copy(this.camera.position).sub(this.envelopeIntersect);
        // angle from z-axis around y-axis
        this._spherical.setFromVector3(_offset);
        // restrict radius to be between desired limits
        // const length = _delta.copy(this.envelopeIntersect).length();
        this._spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this._spherical.radius * scale));
        // move target to panned location
        _offset.setFromSpherical(this._spherical);
        this.camera.position.copy(this.envelopeIntersect).add(_offset);
        this.camera.lookAt(this.envelopeIntersect);
        this.dispatchEvent({ type: 'change' });
    }
    _applyRotateMovement(movement) {
        _offset.copy(this.camera.position).sub(this.position);
        // rotate _offset to "y-axis-is-up" space
        _quat.setFromUnitVectors(this.camera.up, new Vector3(0, 1, 0));
        _quatInverse.copy(_quat).invert();
        _offset.applyQuaternion(_quat);
        // angle from z-axis around y-axis
        this._spherical.setFromVector3(_offset);
        this._spherical.theta -= movement.x;
        this._spherical.phi += movement.y;
        // restrict theta to be between desired limits
        let min = this.minAzimuthAngle;
        let max = this.maxAzimuthAngle;
        const PI2 = Math.PI * 2;
        if (isFinite(min) && isFinite(max)) {
            if (min < -Math.PI)
                min += PI2;
            else if (min > Math.PI)
                min -= PI2;
            if (max < -Math.PI)
                max += PI2;
            else if (max > Math.PI)
                max -= PI2;
            if (min <= max) {
                this._spherical.theta = Math.max(min, Math.min(max, this._spherical.theta));
            }
            else {
                this._spherical.theta = (this._spherical.theta > (min + max) / 2) ?
                    Math.max(min, this._spherical.theta) :
                    Math.min(max, this._spherical.theta);
            }
        }
        // restrict phi to be between desired limits
        this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi));
        this._spherical.makeSafe();
        _offset.setFromSpherical(this._spherical);
        // rotate _offset back to_ "camera-up-vector-is-up" space
        _offset.applyQuaternion(_quatInverse);
        this.camera.position.copy(this.position).add(_offset);
        this.camera.lookAt(this.position);
        this.dispatchEvent({ type: 'change' });
    }
    _applyRotateMovementConstrained(movement) {
        const leftDirection = this.envelopeNormal.clone().cross(_unitY).normalize();
        const upDirection = this.envelopeNormal.clone().cross(leftDirection);
        const envelopeDistance = Math.min(this.envelopeIntersect.distanceTo(this.camera.position), this.constraintDistance * 0.98);
        const x = movement.x * 10;
        let y = movement.y * 10;
        // TODO: implement min/max angles correctly
        if (this.envelopeNormal.dot(_unitY) > 0.9)
            y = Math.max(y, 0);
        if (this.envelopeNormal.dot(_unitY) < -0.9)
            y = Math.min(y, 0);
        // TODO: recalculate envelope distance for new position to prevent jitter when panning actos concve surfaces.
        const envelopePanTarget = this.envelopeIntersect.clone().add(upDirection.multiplyScalar(y)).add(leftDirection.multiplyScalar(x));
        const envelopePanPosition = envelopePanTarget.clone().add(this.envelopeNormal.clone().multiplyScalar(envelopeDistance));
        this.camera.position.copy(envelopePanPosition);
        this.camera.lookAt(envelopePanTarget);
        this.dispatchEvent({ type: 'change' });
    }
    _updateConstraints() {
        raycaster.setFromCamera(new Vector2(), this.camera);
        const intersects = raycaster.intersectObjects([this.envelope], true);
        if (intersects.length) {
            this.envelopeIntersect.copy(intersects[0].point);
            if (intersects[0].face) {
                const normal = intersects[0].face.normal.clone();
                normal.applyQuaternion(intersects[0].object.quaternion);
                this.envelopeNormal.lerp(normal, 0.125).normalize();
                // this.envelopeNormal.copy(normal).normalize();
                // TODO: get smooth mormal
                // const norBuffer = (intersects[0].object as Mesh).geometry.attributes.normal.array;
                // const posBuffer = (intersects[0].object as Mesh).geometry.attributes.position.array;
                // const indBuffer = (intersects[0].object as Mesh).geometry.index.array;
                // const i1 = [indBuffer[intersects[0].face.a], indBuffer[intersects[0].face.a + 1], indBuffer[intersects[0].face.a + 2]];
                // console.log(i1);
                // const p1 = new Vector3(posBuffer[i1[0]], posBuffer[i1[1]], posBuffer[i1[2]])
                // const p2 = new Vector3(posBuffer[intersects[0].face.b], posBuffer[intersects[0].face.b + 1], posBuffer[intersects[0].face.b + 2])
                // const p3 = new Vector3(posBuffer[intersects[0].face.c], posBuffer[intersects[0].face.c + 1], posBuffer[intersects[0].face.c + 2])
                // const n1 = new Vector3(norBuffer[intersects[0].face.a], norBuffer[intersects[0].face.a + 1], norBuffer[intersects[0].face.a + 2])
                // const n2 = new Vector3(norBuffer[intersects[0].face.b], norBuffer[intersects[0].face.b + 1], norBuffer[intersects[0].face.b + 2])
                // const n3 = new Vector3(norBuffer[intersects[0].face.c], norBuffer[intersects[0].face.c + 1], norBuffer[intersects[0].face.c + 2])
                // const dist = new Vector3(p1.distanceTo(intersects[0].point), p2.distanceTo(intersects[0].point), p3.distanceTo(intersects[0].point));
                // // p1.applyMatrix4(intersects[0].object.matrixWorld);
                // this._marker1.position.copy(intersects[0].point);
                // this._marker2.position.copy(p1);
                // // this._marker3.position.copy(p2);
                // // this._marker4.position.copy(p3);
                // console.log(intersects[0]);
                // // console.log(intersects[0].face.a);
                // // console.log(intersects[0].face.b);
                // // console.log(intersects[0].face.c);
            }
        }
        else {
            this.envelopeIntersect.copy(this.position);
            this.envelopeNormal.copy(this.camera.position).normalize();
        }
    }
    _checkConstraintDistance() {
        const envelopeDistance = this.envelopeIntersect.distanceTo(this.camera.position);
        this._constrained = envelopeDistance < this.constraintDistance;
    }
    _constrainedChanged() {
        const positionKF = this.animationClip.tracks[0];
        const targetKF = this.animationClip.tracks[1];
        if (this._constrained) {
            const envelopeDistance = this.envelopeIntersect.distanceTo(this.camera.position);
            this._animCameraPosition.copy(this.envelopeNormal).multiplyScalar(envelopeDistance).add(this.envelopeIntersect);
            this._animCameraTarget.copy(this.envelopeIntersect);
            positionKF.values[0] = this.camera.position.x;
            positionKF.values[1] = this.camera.position.y;
            positionKF.values[2] = this.camera.position.z;
            positionKF.values[3] = this._animCameraPosition.x;
            positionKF.values[4] = this._animCameraPosition.y;
            positionKF.values[5] = this._animCameraPosition.z;
            targetKF.values[0] = this.position.x;
            targetKF.values[1] = this.position.y;
            targetKF.values[2] = this.position.z;
            targetKF.values[3] = this._animCameraTarget.x;
            targetKF.values[4] = this._animCameraTarget.y;
            targetKF.values[5] = this._animCameraTarget.z;
        }
        else {
            this._animCameraPosition.copy(this.camera.position);
            this._animCameraTarget.copy(this.position);
            positionKF.values[0] = this.camera.position.x;
            positionKF.values[1] = this.camera.position.y;
            positionKF.values[2] = this.camera.position.z;
            positionKF.values[3] = this.camera.position.x;
            positionKF.values[4] = this.camera.position.y;
            positionKF.values[5] = this.camera.position.z;
            targetKF.values[0] = this.envelopeIntersect.x;
            targetKF.values[1] = this.envelopeIntersect.y;
            targetKF.values[2] = this.envelopeIntersect.z;
            targetKF.values[3] = this.position.x;
            targetKF.values[4] = this.position.y;
            targetKF.values[5] = this.position.z;
        }
        this.animationAction.play();
        this._animating = true;
        clock.getDelta();
        this._animation();
    }
    _animationFinished() {
        this.animationAction.stop();
        this._animating = false;
    }
    _animation() {
        if (this._animating)
            requestAnimationFrame(this._animation);
        const delta = clock.getDelta();
        this.mixer.update(delta);
        this.camera.position.copy(this._animCameraPosition);
        this.camera.lookAt(this._animCameraTarget);
        this.dispatchEvent({ type: 'change' });
    }
}
export { CameraControls };
//# sourceMappingURL=CameraControls.js.map