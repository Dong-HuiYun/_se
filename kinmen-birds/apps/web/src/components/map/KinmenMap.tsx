import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BirdDto, SightingDto } from "@kinmen/shared";
import { BirdLayer } from "../three/BirdLayer";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

interface Props {
  birds: BirdDto[];
  sightings: SightingDto[]; // 已過濾後要顯示的棲地
  selectedSightingId: number | null;
  onPick: (s: SightingDto | null) => void;
}

export default function KinmenMap({ birds, sightings, selectedSightingId, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layerRef = useRef<BirdLayer | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // 初始化地圖（只一次）
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: STYLE_URL,
      center: [118.36, 24.45],
      zoom: 11.2,
      pitch: 40,
      maxPitch: 70,
    });
    const layer = new BirdLayer();

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => map.addLayer(layer));
    map.on("click", (e) => onPickRef.current(layer.pick(e.point)));
    map.on("mousemove", (e) => {
      map.getCanvas().style.cursor = layer.pick(e.point) ? "pointer" : "";
    });

    mapRef.current = map;
    layerRef.current = layer;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // 資料變動：更新模型並縮放到範圍
  useEffect(() => {
    layerRef.current?.setData(birds, sightings);

    const map = mapRef.current;
    if (!map || sightings.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    sightings.forEach((s) => bounds.extend([s.lng, s.lat]));
    map.fitBounds(bounds, { padding: 90, maxZoom: 14, duration: 900 });
  }, [birds, sightings]);

  // 選取狀態：高亮並移動視角
  useEffect(() => {
    layerRef.current?.setSelected(selectedSightingId);
    const map = mapRef.current;
    const s = sightings.find((x) => x.id === selectedSightingId);
    if (map && s) map.easeTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 14), duration: 700 });
  }, [selectedSightingId, sightings]);

  return <div ref={containerRef} className="h-full w-full" />;
}