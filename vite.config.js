import path from 'path';

export default {
  root: 'frontend',
  build: {
    outDir: '../dist',  // Specify the output directory outside of 'frontend' (can be adjusted)
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: {
        base: path.resolve(__dirname, 'frontend/templates/base.html'),
        index: path.resolve(__dirname, 'frontend/templates/index.html'),
        play: path.resolve(__dirname, 'frontend/templates/play.html'),
      },
    },
  },
  publicDir: 'frontend/static',  // Make sure this points to your static folder
};
