import Vue from 'vue';
import App from './App.vue';
import store from './store';
import ElementUI from 'element-ui';
import locale from 'element-ui/lib/locale';
import lang from 'element-ui/lib/locale/lang/ko';
import './styles.scss';

Vue.use(ElementUI);

locale.use(lang);

Vue.config.productionTip = false;

new Vue({
    store,
    render: h => h(App)
}).$mount('#app');
