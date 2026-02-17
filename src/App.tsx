import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
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
import "./App.css";

type Product = {
  id: number;
  name: string;
  stock: number;
  precio: number;
  qr: string;
};

const initialProducts: Product[] = [
  { id: 1, name: "Arroz", stock: 20, precio: 1.5, qr: "QR-ARROZ-001" },
];

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "add" | "edit" | "scan">("list");
  const [current, setCurrent] = useState<Product | null>(null);

  const addProduct = (
    name: string,
    stock: number,
    precio: number,
    qr: string,
  ) => {
    setProducts([...products, { id: Date.now(), name, stock, precio, qr }]);
    setView("list");
  };

  const saveEdit = (id: number, stock: number, precio: number) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, stock, precio } : p)),
    );
    setView("list");
  };

  const findByQR = (qr: string) => {
    const product = products.find((p) => p.qr === qr);
    if (!product) return alert("Producto no encontrado");
    setCurrent(product);
    setView("edit");
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

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
                          ${p.precio.toFixed(2)}
                        </Chip>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onPress={() => {
                        setCurrent(p);
                        setView("edit");
                      }}
                    >
                      Editar
                    </Button>
                  </CardBody>
                </Card>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8">
                  No se encontraron productos
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
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
                📷 Escanear QR para editar
              </Button>
            </div>
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
    </div>
  );
}

function ScanQR({
  onResult,
  onBack,
}: {
  onResult: (qr: string) => void;
  onBack: () => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
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
        },
        undefined,
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
      } catch (_e) {
        /* ignore */
      }
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
    <Card>
      <CardBody>
        <h2 className="font-bold text-lg mb-3">Escanear QR</h2>

        {!active && (
          <Button color="default" className="w-full mb-3" onPress={startScan}>
            Activar cámara
          </Button>
        )}

        <div id="qr-reader" className="w-full" />

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
              QR: {qr}
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
              startContent={<span className="text-gray-400 text-sm">$</span>}
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
              Reescanear QR
            </Button>
          </div>
        )}
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
  onSave: (id: number, stock: number, precio: number) => void;
  onBack: () => void;
}) {
  const [stock, setStock] = useState(String(product.stock));
  const [precio, setPrecio] = useState(String(product.precio));

  return (
    <Card>
      <CardBody>
        <h2 className="font-bold text-lg mb-3">Editar {product.name}</h2>
        <div className="flex flex-col gap-3">
          <Input
            label="Stock"
            type="number"
            value={stock}
            onValueChange={setStock}
          />
          <Input
            label="Precio"
            type="number"
            step="0.01"
            value={precio}
            onValueChange={setPrecio}
            startContent={<span className="text-gray-400 text-sm">$</span>}
          />
          <Button
            color="success"
            className="w-full"
            onPress={() => onSave(product.id, Number(stock), Number(precio))}
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
