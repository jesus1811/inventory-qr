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
                📷 Escanear QR
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
      } catch {
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
              Reescanear QR
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
