import * as THREE from 'three';
import { createCameraSystem, CAMERA_MODES } from '../../../shared/camera-system.js';

export const MODE = CAMERA_MODES;
export default createCameraSystem(THREE);
