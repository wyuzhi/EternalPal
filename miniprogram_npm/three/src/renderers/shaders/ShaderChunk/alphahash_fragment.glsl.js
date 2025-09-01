export default"\n#ifdef USE_ALPHAHASH\n\n\tif ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;\n\n#endif\n";
//# sourceMappingURL=alphahash_fragment.glsl.js.map