import { useEffect, useRef, useState } from "react";
import type { BarcodeFormat } from "barcode-detector/ponyfill";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  Input,
  Button,
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import "./App.css";

type Product = {
  id: number;
  name: string;
  stock: number;
  precio: number;
  qr: string;
};

const APP_PIN = import.meta.env.VITE_APP_PIN || "7654";

const BARCODE_FORMATS: BarcodeFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
];

let beepCtx: AudioContext | null = null;

const playBeep = () => {
  try {
    beepCtx ??= new AudioContext();
    if (beepCtx.state === "suspended") beepCtx.resume();
    const oscillator = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 1500;
    gain.gain.setValueAtTime(0.2, beepCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, beepCtx.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(beepCtx.destination);
    oscillator.start();
    oscillator.stop(beepCtx.currentTime + 0.12);
  } catch {
    /* ignore */
  }
};

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("auth") === "true",
  );
  const [pin, setPin] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "add" | "edit" | "sell" | "scan">(
    "list",
  );
  const [current, setCurrent] = useState<Product | null>(null);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data ?? []);
  };

  useEffect(() => {
    if (authenticated) {
      supabase
        .from("products")
        .select("*")
        .then(({ data }) => setProducts(data ?? []));
    }
  }, [authenticated]);

  const addProduct = async (
    name: string,
    stock: number,
    precio: number,
    qr: string,
  ) => {
    await supabase.from("products").insert({ name, stock, precio, qr });
    await fetchProducts();
    toast.success(`"${name}" agregado correctamente`);
    setView("list");
  };

  const saveEdit = async (
    id: number,
    updates: Partial<Omit<Product, "id">>,
  ) => {
    await supabase.from("products").update(updates).eq("id", id);
    await fetchProducts();
  };

  const deleteProduct = async (product: Product) => {
    await supabase.from("products").delete().eq("id", product.id);
    await fetchProducts();
    toast.success(`"${product.name}" eliminado`);
  };

  const findByQR = (qr: string) => {
    const product = products.find((p) => p.qr === qr);
    if (!product) return toast.error("Producto no encontrado");
    setCurrent(product);
    setView("sell");
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handlePinDigit = (digit: string) => {
    const next = pin + digit;
    setPin(next);
    if (next.length === APP_PIN.length) {
      if (next === APP_PIN) {
        sessionStorage.setItem("auth", "true");
        setAuthenticated(true);
      } else {
        toast.error("PIN incorrecto");
        setPin("");
      }
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-xs">
          <CardBody className="flex flex-col gap-5 items-center">
            <h2 className="font-bold text-lg">Ingresar PIN</h2>
            <div className="flex gap-3 justify-center">
              {Array.from({ length: APP_PIN.length }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${
                    i < pin.length
                      ? "bg-primary border-primary"
                      : "border-gray-300"
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 w-full">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <Button
                  key={d}
                  size="lg"
                  variant="flat"
                  className="text-xl font-semibold h-14"
                  onPress={() => handlePinDigit(d)}
                >
                  {d}
                </Button>
              ))}
              <div />
              <Button
                size="lg"
                variant="flat"
                className="text-xl font-semibold h-14"
                onPress={() => handlePinDigit("0")}
              >
                0
              </Button>
              <Button
                size="lg"
                variant="light"
                className="text-xl h-14"
                onPress={() => setPin(pin.slice(0, -1))}
              >
                &#9003;
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isBordered maxWidth="sm">
        <NavbarBrand>
          <p className="font-bold text-inherit">Inventario Bodega</p>
        </NavbarBrand>
        <NavbarContent justify="end">
          <Chip size="sm" variant="flat" color="primary">
            {products.length} productos
          </Chip>
        </NavbarContent>
      </Navbar>

      <div className="max-w-md mx-auto p-4">
        {view === "list" && (
          <>
            <Input
              className="mb-4"
              placeholder="Buscar producto..."
              value={search}
              onValueChange={setSearch}
              isClearable
              onClear={() => setSearch("")}
              startContent={<span className="text-gray-400 text-sm">🔍</span>}
            />

            <div className="flex flex-col gap-2 my-3">
              <Button
                color="success"
                className="w-full"
                onPress={() => setView("add")}
              >
                + Registrar producto
              </Button>
              <Button
                color="default"
                variant="bordered"
                className="w-full"
                onPress={() => setView("scan")}
              >
                📷 Escanear código de barras
              </Button>
            </div>

            <div className="space-y-3 mb-4">
              {filtered.map((p) => (
                <Card
                  className="w-full"
                  key={p.id}
                  isPressable
                  onPress={() => {
                    setCurrent(p);
                    setView("edit");
                  }}
                >
                  <CardBody className="flex-row justify-between items-center">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Chip size="sm" variant="flat" color="success">
                          Stock: {p.stock}
                        </Chip>
                        <Chip size="sm" variant="flat" color="warning">
                          Precio: S/{p.precio.toFixed(2)}
                        </Chip>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        color="success"
                        variant="flat"
                        onPress={() => {
                          setCurrent(p);
                          setView("sell");
                        }}
                      >
                        Vender
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => {
                          if (confirm(`Eliminar "${p.name}"?`)) {
                            deleteProduct(p);
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8">
                  No se encontraron productos
                </p>
              )}
            </div>
          </>
        )}

        {view === "scan" && (
          <ScanQR onResult={findByQR} onBack={() => setView("list")} />
        )}
        {view === "add" && (
          <AddView onSave={addProduct} onBack={() => setView("list")} />
        )}
        {view === "sell" && current && (
          <SellView
            product={current}
            onSave={saveEdit}
            onBack={() => setView("list")}
          />
        )}
        {view === "edit" && current && (
          <EditView
            product={current}
            onSave={saveEdit}
            onBack={() => setView("list")}
          />
        )}
      </div>
    </div>
  );
}

const supportsNativeDetector =
  typeof window !== "undefined" && "BarcodeDetector" in window;

type ScanEngine = "nativo" | "wasm";

// Prefers the browser/OS's native reader (Shape Detection API, e.g. Android
// Chrome). Where that's missing or supports none of our formats (iOS Safari,
// Firefox, desktop), loads a ZXing WebAssembly build with the same API on
// demand, so native devices never download it. The .wasm is served from our
// own bundle instead of the library's default CDN.
async function createBarcodeDetector(): Promise<{
  detector: BarcodeDetector;
  engine: ScanEngine;
}> {
  if (supportsNativeDetector) {
    try {
      const supported = await window.BarcodeDetector!.getSupportedFormats();
      const formats = BARCODE_FORMATS.filter((f) => supported.includes(f));
      if (formats.length > 0) {
        return {
          detector: new window.BarcodeDetector!({ formats }),
          engine: "nativo",
        };
      }
    } catch {
      /* fall through to ZXing */
    }
  }

  const [{ BarcodeDetector: ZXingBarcodeDetector, prepareZXingModule }, wasm] =
    await Promise.all([
      import("barcode-detector/ponyfill"),
      import("zxing-wasm/reader/zxing_reader.wasm?url"),
    ]);
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? wasm.default : prefix + path,
    },
    fireImmediately: true,
  });
  return {
    detector: new ZXingBarcodeDetector({
      formats: BARCODE_FORMATS,
    }) as unknown as BarcodeDetector,
    engine: "wasm",
  };
}

// A read is accepted only after the same value is decoded on this many
// consecutive frames; the overlay tracks the code in the meantime.
const CONFIRM_FRAMES = 2;
// Drop an in-progress candidate if it isn't seen again within this window.
const CANDIDATE_TIMEOUT_MS = 300;
// How long the green "locked" marker stays visible before leaving the view.
const LOCK_DISPLAY_MS = 150;
// Mild optical/digital zoom so codes read from farther away, outside the
// lens's minimum focus distance (what native scanner apps do by default).
const SCAN_ZOOM = 1.5;

// Maps a detected barcode's corners from video-pixel space to the displayed
// element's CSS-pixel space, accounting for the object-cover crop.
function toOverlayPoints(
  video: HTMLVideoElement,
  barcode: DetectedBarcode,
): string {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = video.clientWidth;
  const ch = video.clientHeight;
  const scale = Math.max(cw / vw, ch / vh);
  const offsetX = (cw - vw * scale) / 2;
  const offsetY = (ch - vh * scale) / 2;

  const box = barcode.boundingBox;
  const corners =
    barcode.cornerPoints.length === 4
      ? barcode.cornerPoints
      : [
          { x: box.left, y: box.top },
          { x: box.right, y: box.top },
          { x: box.right, y: box.bottom },
          { x: box.left, y: box.bottom },
        ];

  return corners
    .map((p) => `${p.x * scale + offsetX},${p.y * scale + offsetY}`)
    .join(" ");
}

function ScanQR({
  onResult,
  onBack,
}: {
  onResult: (qr: string) => void;
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameHandleRef = useRef<number | null>(null);
  const markerRef = useRef<SVGPolygonElement | null>(null);
  const stoppedRef = useRef(true);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [engine, setEngine] = useState<ScanEngine | null>(null);

  const stopScan = async () => {
    stoppedRef.current = true;

    const video = videoRef.current;
    if (frameHandleRef.current !== null) {
      if (video?.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameHandleRef.current);
      } else {
        cancelAnimationFrame(frameHandleRef.current);
      }
      frameHandleRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (video) {
      video.srcObject = null;
    }

    setActive(false);
    setEngine(null);
  };

  // Runs the detector directly against the live <video> feed, once per
  // camera frame, reading anywhere in view so it behaves like a real
  // handheld scanner. Resolves to null if the scan was cancelled meanwhile.
  const startCameraScan = async (): Promise<ScanEngine | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    streamRef.current = stream;
    video.srcObject = stream;
    await video.play();

    // Applied after the track exists (rather than as a getUserMedia
    // constraint) since that's the form most devices actually honor;
    // without it many phones lock focus once instead of refocusing as you
    // move the barcode into range, which is what forces "hold it still and
    // close" instead of a quick pass-by read.
    const [track] = stream.getVideoTracks();
    try {
      await track.applyConstraints({
        // @ts-expect-error advanced constraints not in lib.dom types
        advanced: [{ focusMode: "continuous" }],
      });
    } catch {
      /* device doesn't support programmatic focus control */
    }

    // Separate call so an unsupported zoom can't cancel the focus setting.
    const zoomRange = (
      track.getCapabilities?.() as { zoom?: { min: number; max: number } }
    )?.zoom;
    if (zoomRange) {
      const zoom = Math.min(Math.max(SCAN_ZOOM, zoomRange.min), zoomRange.max);
      try {
        await track.applyConstraints({
          // @ts-expect-error zoom not in lib.dom types
          advanced: [{ zoom }],
        });
      } catch {
        /* zoom reported but not applicable */
      }
    }

    const { detector, engine } = await createBarcodeDetector();
    // "Volver" or unmount while the detector was loading.
    if (streamRef.current !== stream) return null;

    stoppedRef.current = false;

    let candidate: string | null = null;
    let candidateHits = 0;
    let candidateSeenAt = 0;

    const hideMarker = () => {
      markerRef.current?.setAttribute("visibility", "hidden");
    };
    const showMarker = (barcode: DetectedBarcode, locked: boolean) => {
      const marker = markerRef.current;
      if (!marker) return;
      marker.setAttribute("points", toOverlayPoints(video, barcode));
      marker.setAttribute("stroke", locked ? "#22c55e" : "#facc15");
      marker.setAttribute(
        "fill",
        locked ? "rgba(34, 197, 94, 0.2)" : "rgba(250, 204, 21, 0.15)",
      );
      marker.setAttribute("visibility", "visible");
    };

    const tick = async () => {
      if (stoppedRef.current) return;
      try {
        const results = await detector.detect(video);
        if (stoppedRef.current) return;
        const now = performance.now();

        if (results.length > 0) {
          const barcode = results[0];
          if (
            barcode.rawValue === candidate &&
            now - candidateSeenAt <= CANDIDATE_TIMEOUT_MS
          ) {
            candidateHits++;
          } else {
            candidate = barcode.rawValue;
            candidateHits = 1;
          }
          candidateSeenAt = now;

          const locked = candidateHits >= CONFIRM_FRAMES;
          showMarker(barcode, locked);
          if (locked) {
            playBeep();
            stoppedRef.current = true;
            await new Promise((r) => setTimeout(r, LOCK_DISPLAY_MS));
            await stopScan();
            onResult(barcode.rawValue);
            return;
          }
        } else if (now - candidateSeenAt > CANDIDATE_TIMEOUT_MS) {
          candidate = null;
          candidateHits = 0;
          hideMarker();
        }
      } catch {
        /* transient decode error, keep scanning */
      }
      if (stoppedRef.current) return;
      frameHandleRef.current = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(tick)
        : requestAnimationFrame(tick);
    };

    frameHandleRef.current = video.requestVideoFrameCallback
      ? video.requestVideoFrameCallback(tick)
      : requestAnimationFrame(tick);
    return engine;
  };

  const startScan = async () => {
    setStarting(true);
    try {
      const started = await startCameraScan();
      if (started) {
        setEngine(started);
        setActive(true);
      }
    } catch (err) {
      console.error(err);
      await stopScan();
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        alert("Debes permitir el acceso a la cámara para escanear.");
      } else if (name === "NotFoundError") {
        alert("No se encontró ninguna cámara en este dispositivo.");
      } else {
        alert("No se pudo iniciar el escáner");
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold text-lg">Escanear código de barras</h2>
          {engine && (
            <Chip
              size="sm"
              color={engine === "nativo" ? "success" : "primary"}
              variant="flat"
            >
              {engine === "nativo" ? "Motor nativo" : "Motor WebAssembly"}
            </Chip>
          )}
        </div>

        {!active && (
          <Button
            color="default"
            className="w-full mb-3"
            isLoading={starting}
            onPress={startScan}
          >
            Activar cámara
          </Button>
        )}

        <div
          className="relative w-full overflow-hidden rounded-lg bg-black"
          style={{ aspectRatio: "4 / 3" }}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          {active && (
            <>
              <div className="pointer-events-none absolute inset-x-[5%] top-1/2 h-1/2 -translate-y-1/2 rounded-md border-2 border-white/40" />
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                <polygon
                  ref={markerRef}
                  visibility="hidden"
                  fill="rgba(250, 204, 21, 0.15)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </div>

        <Button
          variant="light"
          className="w-full mt-3"
          onPress={() => {
            stopScan();
            onBack();
          }}
        >
          Volver
        </Button>
      </CardBody>
    </Card>
  );
}

function AddView({
  onSave,
  onBack,
}: {
  onSave: (name: string, stock: number, precio: number, qr: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [precio, setPrecio] = useState("");
  const [qr, setQr] = useState<string | null>(null);

  return (
    <Card>
      <CardBody>
        <h2 className="font-bold text-lg mb-3">Registrar producto</h2>

        {!qr && <ScanQR onResult={setQr} onBack={onBack} />}

        {qr && (
          <div className="flex flex-col gap-3">
            <Chip size="sm" variant="flat" color="secondary">
              Código: {qr}
            </Chip>
            <Input
              label="Nombre"
              placeholder="Nombre del producto"
              value={name}
              onValueChange={setName}
            />
            <Input
              label="Stock"
              placeholder="Cantidad"
              type="number"
              value={stock}
              onValueChange={setStock}
            />
            <Input
              label="Precio"
              placeholder="0.00"
              type="number"
              step="0.01"
              value={precio}
              onValueChange={setPrecio}
              startContent={<span className="text-gray-400 text-sm">S/</span>}
            />
            <Button
              color="primary"
              className="w-full"
              onPress={() => onSave(name, Number(stock), Number(precio), qr)}
            >
              Guardar producto
            </Button>
            <Button
              variant="light"
              className="w-full"
              onPress={() => setQr(null)}
            >
              Reescanear código
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SellView({
  product,
  onSave,
  onBack,
}: {
  product: Product;
  onSave: (id: number, updates: Partial<Omit<Product, "id">>) => void;
  onBack: () => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const stock = product.stock;
  const price = product.precio;

  const qty = Number(cantidad) || 0;

  const handleAgregar = () => {
    const newStock = stock + qty;
    onSave(product.id, { stock: newStock });
    toast.success(`Agregaste ${qty} ${product.name}`);
    onBack();
  };

  const handleDescontar = () => {
    const newStock = stock - qty;
    onSave(product.id, { stock: newStock });
    toast.success(`Vendiste ${qty} ${product.name}`);
    onBack();
  };

  return (
    <Card>
      <CardBody>
        <h2 className="font-bold text-lg mb-3">Vender {product.name}</h2>
        <div className="flex flex-col gap-4">
          <div className="w-full flex flex-wrap gap-2">
            <Chip size="lg" variant="flat" color="primary">
              Stock: {stock}
            </Chip>
            <Chip size="lg" variant="flat" color="secondary">
              Precio: S/{price.toFixed(2)}
            </Chip>
          </div>
          <Input
            label="Cantidad"
            placeholder="Ej: 5"
            type="number"
            inputMode="numeric"
            value={cantidad}
            onValueChange={setCantidad}
          />
          <div className="flex gap-2">
            <Button
              color="success"
              className="flex-1"
              isDisabled={qty <= 0}
              onPress={handleAgregar}
            >
              + Agregar {qty > 0 && qty}
            </Button>
            <Button
              color="danger"
              className="flex-1"
              isDisabled={qty <= 0 || qty > stock}
              onPress={handleDescontar}
            >
              - Vender {qty > 0 && qty}
            </Button>
          </div>
          <Button variant="light" className="w-full" onPress={onBack}>
            Volver
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function EditView({
  product,
  onSave,
  onBack,
}: {
  product: Product;
  onSave: (id: number, updates: Partial<Omit<Product, "id">>) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [stock, setStock] = useState(String(product.stock));
  const [precio, setPrecio] = useState(String(product.precio));

  return (
    <Card>
      <CardBody>
        <h2 className="font-bold text-lg mb-3">Editar {product.name}</h2>
        <div className="flex flex-col gap-4">
          <Input label="Nombre" value={name} onValueChange={setName} />
          <Input
            label="Stock"
            type="number"
            inputMode="numeric"
            value={stock}
            onValueChange={setStock}
          />
          <Input
            label="Precio"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={precio}
            onValueChange={setPrecio}
            startContent={<span className="text-gray-400 text-sm">S/</span>}
          />
          <Button
            color="primary"
            className="w-full"
            onPress={() => {
              onSave(product.id, {
                name,
                stock: Number(stock),
                precio: Number(precio),
              });
              toast.success(`${product.name} actualizado`);
              onBack();
            }}
          >
            Guardar cambios
          </Button>
          <Button variant="light" className="w-full" onPress={onBack}>
            Volver
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
