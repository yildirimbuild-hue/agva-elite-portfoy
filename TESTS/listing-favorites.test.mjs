import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

async function derleVeIceAktar(relativePath) {
  const sourcePath = path.resolve(relativePath);
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    fileName: sourcePath,
  }).outputText;
  const directory = await mkdtemp(path.join(tmpdir(), "ikisu-favori-test-"));
  const outputPath = path.join(directory, `${path.basename(relativePath, ".ts")}.mjs`);
  await writeFile(outputPath, output, "utf8");
  return import(`${new URL(`file://${outputPath}`).href}?v=${Date.now()}`);
}

function bellekDeposu(initialValue = null) {
  let value = initialValue;
  return {
    getItem() {
      return value;
    },
    setItem(_key, nextValue) {
      value = nextValue;
    },
    value() {
      return value;
    },
  };
}

test("favori ilan depolaması bozuk veriyi güvenle temizler", async () => {
  const favorites = await derleVeIceAktar("src/lib/listing-favorites.ts");

  assert.deepEqual(favorites.favoriIlanKimlikleriniCoz(null), []);
  assert.deepEqual(favorites.favoriIlanKimlikleriniCoz("{bozuk"), []);
  assert.deepEqual(
    favorites.favoriIlanKimlikleriniCoz(JSON.stringify([" ilan-1 ", "", 12, "ilan-1", "ilan-2"])),
    ["ilan-1", "ilan-2"],
  );
});

test("aynı ilan ilk işlemde favoriye eklenir, ikinci işlemde çıkarılır", async () => {
  const favorites = await derleVeIceAktar("src/lib/listing-favorites.ts");
  const storage = bellekDeposu();

  assert.equal(favorites.favoriIlanDurumunuDepodaDegistir(storage, "ilan-1"), true);
  assert.deepEqual(JSON.parse(storage.value()), ["ilan-1"]);
  assert.equal(favorites.favoriIlanDurumunuDepodaDegistir(storage, "ilan-1"), false);
  assert.deepEqual(JSON.parse(storage.value()), []);
});

test("favori görünümü yalnız kaydedilmiş ve halen yayında olan ilanları seçer", async () => {
  const favorites = await derleVeIceAktar("src/lib/listing-favorites.ts");
  const ilanlar = [
    { id: "ilan-1", title: "Birinci" },
    { id: "ilan-2", title: "İkinci" },
    { id: "ilan-3", title: "Üçüncü" },
  ];

  assert.deepEqual(
    favorites.favoriIlanlariSec(ilanlar, ["ilan-3", "silinmis-ilan", "ilan-1"]),
    [ilanlar[0], ilanlar[2]],
  );
});

test("ilan detayındaki favori kontrolü erişilebilir durum ve kullanıcı geri bildirimi taşır", async () => {
  const source = await readFile("src/components/ListingDetail.tsx", "utf8");

  assert.match(source, /aria-pressed=\{favoride\}/);
  assert.match(source, /Favorilerden çıkar/);
  assert.match(source, /Favorilere ekle/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /favoriIlanDurumunuDepodaDegistir/);
});

test("portföy favorileri ekleme, sayım, filtreleme, kalıcılık ve boş durum zincirini kapatır", async () => {
  const source = await readFile("src/components/PortfolioApp.tsx", "utf8");

  assert.match(source, /favoriIlanKimlikleriniCoz/);
  assert.match(source, /favoriIlanDurumunuDepodaDegistir/);
  assert.match(source, /favoriIlanlariSec/);
  assert.match(source, /FAVORI_ILANLAR_DEPOLAMA_ANAHTARI/);
  assert.match(source, /addEventListener\("storage"/);
  assert.match(source, /Favorilerim \(\{favoriIlanlari\.length\}\)/);
  assert.match(source, /aria-pressed=\{favoride\}/);
  assert.match(source, /sadeceFavoriler/);
  assert.match(source, /Henüz favori ilanınız yok/);
  assert.match(source, /aria-live="polite"/);
});
