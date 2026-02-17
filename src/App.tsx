import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./App.css";

const initialProducts = [
  { id: 1, name: "Arroz", stock: 20, qr: "QR-ARROZ-001" },
];

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list"); // list | add | edit | scan
  const [current, setCurrent] = useState(null);

  const addProduct = (name, stock, qr) => {
    setProducts([
      ...products,
      { id: Date.now(), name, stock: Number(stock), qr },
    ]);
    setView("list");
  };

  const saveEdit = (id, stock) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, stock: Number(stock) } : p))
    );
    setView("list");
  };

  const findByQR = (qr) => {
    const product = products.find((p) => p.qr === qr);
    if (!product) return alert("Producto no encontrado");
    setCurrent(product);
    setView("edit");
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-center">Inventario Bodega</h1>

      {view === "list" && (
        <>
          <input
            className="w-full border p-2 rounded mb-3"
            placeholder="Buscar producto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="space-y-3 mb-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3 rounded-xl shadow flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-gray-600">Stock: {p.stock}</p>
                </div>
                <button
                  onClick={() => {
                    setCurrent(p);
                    setView("edit");
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setView("add")}
            className="w-full bg-green-600 text-white py-2 rounded mb-2"
          >
            + Registrar producto (QR)
          </button>

          <button
            onClick={() => setView("scan")}
            className="w-full bg-black text-white py-2 rounded"
          >
            📷 Escanear QR para editar
          </button>
        </>
      )}

      {view === "scan" && (
        <ScanQR onResult={findByQR} onBack={() => setView("list")} />
      )}
      {view === "add" && (
        <AddView onSave={addProduct} onBack={() => setView("list")} />
      )}
      {view === "edit" && current && (
        <EditView
          product={current}
          onSave={saveEdit}
          onBack={() => setView("list")}
        />
      )}
    </div>
  );
}

function ScanQR({ onResult, onBack }) {
  const scannerRef = useRef(null);
  const [active, setActive] = useState(false);

  const startScan = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          stopScan();
          onResult(decodedText);
        }
      );

      setActive(true);
    } catch (err) {
      console.error(err);
      alert("No se pudo acceder a la cámara");
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setActive(false);
  };

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-bold mb-3">Escanear QR</h2>

      {!active && (
        <button
          onClick={startScan}
          className="w-full bg-black text-white py-2 rounded mb-3"
        >
          Activar cámara
        </button>
      )}

      <div id="qr-reader" className="w-full" />

      <button
        onClick={() => {
          stopScan();
          onBack();
        }}
        className="w-full mt-3 text-gray-600"
      >
        Volver
      </button>
    </div>
  );
}

function AddView({ onSave, onBack }) {
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [qr, setQr] = useState(null);

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-bold mb-3">Registrar producto</h2>

      {!qr && <ScanQR onResult={setQr} onBack={onBack} />}

      {qr && (
        <>
          <p className="text-xs text-gray-500 mb-2">QR detectado: {qr}</p>
          <input
            className="w-full border p-2 rounded mb-2"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full border p-2 rounded mb-3"
            placeholder="Stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <button
            onClick={() => onSave(name, stock, qr)}
            className="w-full bg-blue-600 text-white py-2 rounded mb-2"
          >
            Guardar producto
          </button>
          <button onClick={() => setQr(null)} className="w-full text-gray-600">
            Reescanear QR
          </button>
        </>
      )}
    </div>
  );
}

function EditView({ product, onSave, onBack }) {
  const [stock, setStock] = useState(product.stock);

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-bold mb-3">Editar {product.name}</h2>
      <input
        className="w-full border p-2 rounded mb-3"
        type="number"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
      />
      <button
        onClick={() => onSave(product.id, stock)}
        className="w-full bg-green-600 text-white py-2 rounded mb-2"
      >
        Guardar cambios
      </button>
      <button onClick={onBack} className="w-full text-gray-600">
        Volver
      </button>
    </div>
  );
}
