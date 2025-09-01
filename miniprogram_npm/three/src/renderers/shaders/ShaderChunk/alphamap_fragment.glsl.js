export default"\n#ifdef USE_ALPHAMAP\n\n\tdiffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;\n\n#endif\n";
//# sourceMappingURL=alphamap_fragment.glsl.js.map