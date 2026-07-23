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

test("ilan detayındaki favori kontrolü erişilebilir durum ve kullanıcı geri bildirimi taşır", async () => {
  const source = await readFile("src/components/ListingDetail.tsx", "utf8");

  assert.match(source, /aria-pressed=\{favoride\}/);
  assert.match(source, /Favorilerden çıkar/);
  assert.match(source, /Favorilere ekle/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /favoriIlanDurumunuDepodaDegistir/);
});
