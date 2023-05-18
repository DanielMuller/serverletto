<template lang="pug">
q-layout(view="hHh lpR fFf")
  q-header.bg-primary.text-white(elevated)
    q-toolbar
      q-avatar.app-logo
        img(src="/serverlessguru-logo.svg")
      q-toolbar-title(shrink) Serverletto
      q-space
      div.gt-xs {{ $t('tagline') }}
  q-page-container
    router-view
</template>

<style lang="sass">
.app-logo
  img
    transform: scaleX(+1)
    transition: transform .8s ease-in-out
  &:hover img
    transform: scaleX(-1)
</style>

<script lang="ts" setup></script>
