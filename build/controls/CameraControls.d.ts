import { MOUSE, TOUCH, Vector3, PerspectiveCamera, Mesh, MeshNormalMaterial, AnimationClip, AnimationMixer, AnimationAction, CapsuleBufferGeometry } from 'three';
import { ControlsCamera, PointerTracker } from 'io-gui-three-controls';
declare class CameraControls extends ControlsCamera {
    minDistance: number;
    maxDistance: number;
    constraintDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    minAzimuthAngle: number;
    maxAzimuthAngle: number;
    enableZoom: boolean;
    zoomSpeed: number;
    enableRotate: boolean;
    rotateSpeed: number;
    mouseButtons: {
        LEFT: MOUSE;
        MIDDLE: MOUSE;
        RIGHT: MOUSE;
    };
    touches: {
        ONE: TOUCH;
        TWO: TOUCH;
    };
    private readonly _spherical;
    _interacting: boolean;
    _animating: boolean;
    _constrained: boolean;
    envelope: Mesh<CapsuleBufferGeometry, MeshNormalMaterial>;
    envelopeIntersect: Vector3;
    envelopeNormal: Vector3;
    mixer: AnimationMixer;
    animationClip: AnimationClip;
    animationAction: AnimationAction;
    _animCameraPosition: Vector3;
    _animCameraTarget: Vector3;
    constructor(camera: PerspectiveCamera, domElement: HTMLElement);
    _onContextMenu(event: Event): void;
    _onWheel(event: WheelEvent): void;
    onTrackedPointerDown(pointer: PointerTracker, pointers: PointerTracker[]): void;
    onTrackedPointerMove(pointer: PointerTracker, pointers: PointerTracker[], center: PointerTracker): void;
    onTrackedPointerUp(pointer: PointerTracker, pointers: PointerTracker[]): void;
    _pointerDolly(pointer: PointerTracker): void;
    _twoPointerDolly(pointers: PointerTracker[]): void;
    _pointerRotate(pointer: PointerTracker): void;
    _applyDollyMovement(dollyMovement: number): void;
    _applyDollyMovementConstrained(dollyMovement: number): void;
    _applyRotateMovement(movement: Vector3): void;
    _applyRotateMovementConstrained(movement: Vector3): void;
    _updateConstraints(): void;
    _checkConstraintDistance(): void;
    _constrainedChanged(): void;
    _animationFinished(): void;
    _animation(): void;
}
export { CameraControls };
//# sourceMappingURL=CameraControls.d.ts.map