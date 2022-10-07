# node-csgo-voice

A node application for converting CELT to WAV and back again.

It uses FFI to invoke exported CELT methods on `vaudio_celt_client.so`. This is available in the Linux distribution of the CSGO dedicated server. (I also required `libtier0_client.so` to be available)

Usage:

```
LD_LIBRARY_PATH=path/to/csgo/bin/linux64 node (encode/decode).js voice-76561197966986733.(wav/bin)
```
