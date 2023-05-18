<template lang="pug">
q-page.column.items-center(padding)
  q-banner.bg-negative.text-white(rounded)
    template(v-slot:avatar)
        q-icon.q-pr-md(name="error" color="white")
        h4 {{ $t('invalid_code') }}
  q-btn.q-ma-md(:to="{'name':'Home'}" icon="home" color="primary" :label="$t('back_home')")
</template>
