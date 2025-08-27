import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'auto'
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external: [
      '@cvplus/core',
      '@cvplus/auth',
      'sharp',
      'ffmpeg.js',
      'firebase',
      'aws-sdk',
      'mime-types',
      'file-type',
      'image-size',
      'music-metadata'
    ],
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        sourceMap: true,
        inlineSources: true
      })
    ]
  },
  // Separate builds for each module
  {
    input: {
      'types/index': 'src/types/index.ts',
      'constants/index': 'src/constants/index.ts',
      'services/index': 'src/services/index.ts',
      'processors/index': 'src/processors/index.ts',
      'storage/index': 'src/storage/index.ts',
      'utils/index': 'src/utils/index.ts'
    },
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        exports: 'auto',
        entryFileNames: '[name].js'
      },
      {
        dir: 'dist',
        format: 'esm',
        sourcemap: true,
        entryFileNames: '[name].esm.js'
      }
    ],
    external: [
      '@cvplus/core',
      '@cvplus/auth',
      'sharp',
      'ffmpeg.js',
      'firebase',
      'aws-sdk',
      'mime-types',
      'file-type',
      'image-size',
      'music-metadata'
    ],
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        sourceMap: true,
        inlineSources: true
      })
    ]
  }
];