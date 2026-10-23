/* 酒店只读数据适配层：默认只使用本地演示数据，不保存任何登录凭据。 */
(function (root) {
  'use strict';

  const ENDPOINTS = Object.freeze({
    getHotel: '/admin/hotel/queryHotelInfo',
    getHotelFacilities: '/admin/hotel/queryHotelFacilityInfo',
    getHotelImages: '/admin/hotel/queryHotelImageInfo',
    getRooms: '/admin/room/queryRoomInfo',
    getRoomFacilities: '/admin/room/queryRoomFacilityInfo',
    getProductRooms: '/product/product/queryRoomList',
    getProductNames: '/product/product/queryProductNameList',
    getProducts: '/product/product/queryOrderProductPage',
    getOnSaleProducts: '/product/product/queryOnSaleProductList',
    getProductPrices: '/product/productPrice/queryProductPriceInfo',
    getPriceAndQuota: '/order/orderProduct/queryPriceAndQuota'
  });

  class ApiError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = 'ApiError';
      this.code = options.code || 'REQUEST_FAILED';
      this.status = options.status || 0;
      this.retryable = Boolean(options.retryable);
    }
  }

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const aborted = () => new DOMException('请求已取消', 'AbortError');
  const authCodes = new Set(['90001', '90013']);

  function createClient(config = {}) {
    const mode = config.mode || 'demo';
    if (!['demo', 'remote'].includes(mode)) throw new ApiError('未知数据模式', { code: 'CONFIG_ERROR' });
    if (mode === 'remote' && (!config.baseURL || typeof config.tokenProvider !== 'function')) {
      throw new ApiError('真实接口模式需要 baseURL 和 tokenProvider', { code: 'CONFIG_ERROR' });
    }
    const baseURL = mode === 'remote' ? String(config.baseURL).replace(/\/+$/, '') : '';
    if (mode === 'remote') {
      const checked = new URL(baseURL, root.location ? root.location.href : 'http://localhost');
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(checked.hostname);
      if (checked.protocol !== 'https:' && !(checked.protocol === 'http:' && local)) {
        throw new ApiError('真实接口必须使用 HTTPS 或本地代理', { code: 'CONFIG_ERROR' });
      }
    }
    const fetcher = config.fetch || (root.fetch && root.fetch.bind(root));
    if (mode === 'remote' && !fetcher) throw new ApiError('当前环境不支持 fetch', { code: 'CONFIG_ERROR' });
    const active = new Set();
    const timeoutMs = Math.max(1, Number(config.timeoutMs) || 15000);
    // 演示数据由页面独立的数据文件传入；空数据是合法的空状态。
    let demoData = clone(config.demoData || {});

    function notify() {
      if (typeof config.onActivity === 'function') {
        try { config.onActivity({ pending: active.size, loading: active.size > 0 }); } catch (_) { /* 展示层不影响请求 */ }
      }
    }

    function list(value) {
      return Array.isArray(value) ? value : (value && Array.isArray(value.list) ? value.list : []);
    }

    function demo(method, params) {
      const rooms = list(demoData.rooms);
      const products = list(demoData.products);
      switch (method) {
        case 'getHotel': return demoData.hotel || null;
        case 'getHotelFacilities': return demoData.hotelFacilities || {};
        case 'getHotelImages': return demoData.hotelImages || { images: [] };
        case 'getRooms': return params.roomId ? rooms.filter(room => String(room.roomId) === String(params.roomId)) : rooms;
        case 'getRoomFacilities': return demoData.roomFacilities || {};
        case 'getProductRooms': return { list: rooms.map(room => ({ roomId: room.roomId, roomName: room.roomName })) };
        case 'getProductNames': {
          const names = Array.from(new Set(products.map(product => product.productName).filter(Boolean)));
          return { list: names.filter(name => name.includes(params.productName || '')).map(productName => ({ productName })) };
        }
        case 'getProducts':
        case 'getOnSaleProducts': {
          const filtered = products.filter(product =>
            (!params.roomId || String(product.roomId) === String(params.roomId)) &&
            (!params.productName || String(product.productName || '').includes(params.productName))
          );
          if (method === 'getOnSaleProducts') return { list: filtered };
          const pageSize = Math.max(1, Math.min(200, Number(params.pageSize) || 20));
          const currentPage = Math.max(1, Number(params.currentPage) || 1);
          return { list: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), totalCount: filtered.length };
        }
        case 'getProductPrices':
        case 'getPriceAndQuota': {
          const price = (demoData.prices || {})[params.productId];
          if (!price) throw new ApiError('当前演示产品暂无价格数据', { code: 'DEMO_PRICE_UNAVAILABLE' });
          const result = clone(price);
          if (Array.isArray(result.productPriceQuotaList)) {
            result.productPriceQuotaList = result.productPriceQuotaList.filter(day =>
              (!params.startDate || day.date >= params.startDate) && (!params.endDate || day.date < params.endDate)
            );
          }
          return result;
        }
        default: throw new ApiError('不支持的只读接口', { code: 'UNKNOWN_METHOD' });
      }
    }

    async function request(method, params = {}, options = {}) {
      if (!ENDPOINTS[method]) throw new ApiError('不支持的只读接口', { code: 'UNKNOWN_METHOD' });
      if (options.signal && options.signal.aborted) throw aborted();
      const controller = new AbortController();
      let timedOut = false;
      let timer;
      let rejectCancellation;
      const cancellation = new Promise((_, reject) => { rejectCancellation = reject; });
      const onAbort = () => rejectCancellation(timedOut
        ? new ApiError('查询超时，请稍后重试', { code: 'TIMEOUT', retryable: true }) : aborted());
      const externalAbort = () => controller.abort();
      controller.signal.addEventListener('abort', onAbort, { once: true });
      if (options.signal) options.signal.addEventListener('abort', externalAbort, { once: true });
      active.add(controller);
      notify();
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, Number(options.timeoutMs) || timeoutMs);
      try {
        const operation = (async () => {
          if (mode === 'demo') {
            const delay = Math.max(0, Number(config.demoDelayMs) || 0);
            if (delay) await new Promise(resolve => setTimeout(resolve, delay));
            if (controller.signal.aborted) throw aborted();
            return clone(demo(method, params));
          }
          // token 只存在于本次请求作用域，不写入 localStorage、日志或文件。
          const token = await config.tokenProvider();
          if (controller.signal.aborted) throw aborted();
          if (!token || typeof token !== 'string') throw new ApiError('请先登录后再查询', { code: 'AUTH_REQUIRED', status: 401 });
          const response = await fetcher(baseURL + ENDPOINTS[method], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8', 'X-Token': token },
            body: JSON.stringify(params),
            signal: controller.signal,
            credentials: 'omit',
            cache: 'no-store'
          });
          if (response.status === 401 || response.status === 403) {
            throw new ApiError('登录已失效，请重新登录', { code: 'AUTH_REQUIRED', status: response.status });
          }
          if (!response.ok) throw new ApiError('查询服务暂不可用，请重试', { code: 'HTTP_ERROR', status: response.status, retryable: response.status >= 500 || response.status === 429 });
          let body;
          try { body = await response.json(); } catch (_) { throw new ApiError('接口返回格式不正确', { code: 'INVALID_RESPONSE' }); }
          if (!body || typeof body !== 'object' || !('result' in body)) throw new ApiError('接口响应缺少业务信封', { code: 'INVALID_RESPONSE' });
          if (Number(body.result) !== 1) {
            if (authCodes.has(String(body.code))) throw new ApiError('登录已失效，请重新登录', { code: 'AUTH_REQUIRED', status: 401 });
            throw new ApiError(String(body.msg || body.message || '查询失败'), { code: String(body.code || 'BUSINESS_ERROR') });
          }
          return body.data;
        })();
        return await Promise.race([operation, cancellation]);
      } catch (error) {
        if (timedOut) throw new ApiError('查询超时，请稍后重试', { code: 'TIMEOUT', retryable: true });
        if (error instanceof ApiError || (error && error.name === 'AbortError')) throw error;
        throw new ApiError('网络连接失败，请检查网络后重试', { code: 'NETWORK_ERROR', retryable: true });
      } finally {
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', onAbort);
        if (options.signal) options.signal.removeEventListener('abort', externalAbort);
        active.delete(controller);
        notify();
      }
    }

    const client = {
      mode,
      get pending() { return active.size; },
      abortAll() { active.forEach(controller => controller.abort()); },
      setDemoData(data) {
        if (mode !== 'demo') throw new ApiError('真实接口模式不能替换演示数据', { code: 'CONFIG_ERROR' });
        demoData = clone(data || {});
      }
    };
    Object.keys(ENDPOINTS).forEach(method => { client[method] = (params, options) => request(method, params, options); });
    return Object.freeze(client);
  }

  const API = Object.freeze({ createClient, ApiError, ENDPOINTS });
  root.HotelBookingAPI = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
