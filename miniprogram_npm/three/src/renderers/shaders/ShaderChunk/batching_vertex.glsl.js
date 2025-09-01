export default"\n#ifdef USE_BATCHING\n\tmat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );\n#endif\n";
//# sourceMappingURL=batching_vertex.glsl.js.map