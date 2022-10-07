var ffi = require("ffi-napi");
var ref = require("ref-napi");
var fs = require("fs");
var WaveFile = require("wavefile").WaveFile;

if (process.argv.length !== 3) {
  console.error(`Format: <input path>`);
  process.exit(1);
}

var CELTMode = ref.types.void;
var CELTModePtr = ref.refType(CELTMode);

var CELTEncoder = ref.types.void;
var CELTEncoderPtr = ref.refType(CELTEncoder)

var vaudio_celt = ffi.Library("vaudio_celt_client", {
  celt_mode_create: [
    CELTModePtr,
    [
      "int", // Fs
      "int", // frame_size
      ref.refType("int"), // error
    ],
  ],
  celt_encoder_create_custom: [
    CELTEncoderPtr,
    [
      CELTModePtr, // mode
      "int", // len
      ref.refType("int"), // error
    ],
  ],
  celt_encode: [
    "int",
    [
      CELTEncoderPtr, // st
      ref.refType(ref.types.short), // pcm
      "int", // frame_size
      ref.refType(ref.types.uchar), // compressed
      "int", // maxCompressedBytes
    ],
  ],
});

const SAMPLE_RATE = 22050;
const FRAME_SIZE = 512;

var errorPtr = ref.alloc("int", 0);

var modePtr = vaudio_celt.celt_mode_create(SAMPLE_RATE, FRAME_SIZE, errorPtr);
if (modePtr.isNull()) {
  console.error(`celt_mode_create failed (${errorPtr.deref()})`);
  process.exit(1);
}
var encoderPtr = vaudio_celt.celt_encoder_create_custom(modePtr, 1, errorPtr)
if (encoderPtr.isNull()) {
  console.error(`celt_encoder_create_custom failed (${errorPtr.deref()})`);
  process.exit(1);
}

var infile = process.argv[2];
console.log(`Reading ${infile}...`);

var infileBuffer = fs.readFileSync(infile)
var wav = new WaveFile()
wav.fromBuffer(infileBuffer)
console.log(wav.chunkSize)
console.log(wav.data.samples)
console.log(wav.container)

var buffer = wav.data.samples 
var output = Buffer.alloc(((buffer.length / FRAME_SIZE) * 64) / 2);
var outputLength = Buffer.alloc(output.length)

var read = 0;
var written = 0;

while (read < buffer.length) {
  var ret = vaudio_celt.celt_encode(
    encoderPtr,
    buffer.subarray(read),
    FRAME_SIZE,
    output.subarray(written),
    64,
  );

  console.log(output.subarray(written))

  if (ret < 0) {
    console.error(`celt_encode failed (${ret})`);
    continue;
  }

  read += FRAME_SIZE * 2;
  written += 64;

  process.stdout.write(`\rEncoded ${read}/${buffer.length}... `);
}

const outfile = infile + ".dat";
console.log(`\nWriting output to ${outfile}...`);

fs.writeFileSync(outfile, output)

console.log(`Done!`);
