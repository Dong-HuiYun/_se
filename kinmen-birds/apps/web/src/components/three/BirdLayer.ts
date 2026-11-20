import * as THREE from "three";
import { MercatorCoordinate } from "maplibre-gl";
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MlMap } from "maplibre-gl";
import type { BirdDto, SightingDto } from "@kinmen/shared";
import { buildBirdModel, disposeModel } from "./birdModel";
import { placeSightings } from "../../lib/placement";

// 以全島中心當場景原點，模型座標用「相對公尺」，避免 float32 在 Mercator 單位下抖動
const ORIGIN_LNGLAT: [number, number] = [118.35, 24.45];

export class BirdLayer implements CustomLayerInterface {
  readonly id = "bird-3d";
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;

  private map?: MlMap;
  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private models = new Map<number, THREE.Group>();
  private sightings: SightingDto[] = [];
  private selectedId: number | null = null;
  private origin = MercatorCoordinate.fromLngLat(ORIGIN_LNGLAT, 0);
  private unit = this.origin.meterInMercatorCoordinateUnits();

  constructor() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-1, -1.5, 2.5);
    this.scene.add(sun);
  }

  setData(birds: BirdDto[], sightings: SightingDto[]) {
    for (const g of this.models.values()) {
      this.scene.remove(g);
      disposeModel(g);
    }
    this.models.clear();
    this.sightings = sightings;

    const scaleBySlug = new Map(birds.map((b) => [b.slug, b.modelScale]));
    for (const s of sightings) {
      const g = buildBirdModel(s.birdSlug, scaleBySlug.get(s.birdSlug) ?? 1);
      this.scene.add(g);
      this.models.set(s.id, g);
    }
    this.map?.triggerRepaint();
  }

  setSelected(id: number | null) {
    this.selectedId = id;
    this.map?.triggerRepaint();
  }

  /** 以螢幕座標點選：回傳最近且在半徑內的棲地 */
  pick(point: { x: number; y: number }): SightingDto | null {
    if (!this.map) return null;
    let best: SightingDto | null = null;
    let bestD = Infinity;
    for (const p of placeSightings(this.sightings, this.map.getZoom())) {
      const sp = this.map.project([p.lng, p.lat]);
      const d = Math.hypot(sp.x - point.x, sp.y - point.y);
      if (d < p.px * 0.75 && d < bestD) {
        best = p.sighting;
        bestD = d;
      }
    }
    return best;
  }

  onAdd(map: MlMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
  }

  onRemove() {
    this.renderer?.dispose();
    this.renderer = undefined;
    this.map = undefined;
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
    if (!this.map || !this.renderer) return;

    const t = performance.now() / 1000;
    const placed = placeSightings(this.sightings, this.map.getZoom());

    placed.forEach((p, i) => {
      const g = this.models.get(p.sighting.id);
      if (!g) return;
      const m = MercatorCoordinate.fromLngLat([p.lng, p.lat], 0);
      const x = (m.x - this.origin.x) / this.unit;
      const y = -(m.y - this.origin.y) / this.unit; // Mercator y 向南增加，翻轉成「北為 +y」
      const k = p.sizeM * (g.userData.modelScale as number) * (p.sighting.id === this.selectedId ? 1.4 : 1);
      g.scale.setScalar(k);
      g.position.set(x, y, k * (0.1 + 0.04 * Math.sin(t * 2 + i)));
      g.rotation.z = t * 0.5 + i;
    });

    const mainMatrix = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
    const local = new THREE.Matrix4()
      .makeTranslation(this.origin.x, this.origin.y, this.origin.z)
      .scale(new THREE.Vector3(this.unit, -this.unit, this.unit));
    this.camera.projectionMatrix = mainMatrix.multiply(local);

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint(); // 持續重繪以播放旋轉/浮動動畫
  }
}