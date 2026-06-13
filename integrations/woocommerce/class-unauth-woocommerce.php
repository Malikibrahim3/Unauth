<?php
/**
 * WooCommerce storefront collector integration.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('UNAUTH_VERSION')) {
    define('UNAUTH_VERSION', '1.0.0');
}

if (!class_exists('Unauth_WooCommerce')) {
    class Unauth_WooCommerce {
        public function __construct() {
            add_action('wp_enqueue_scripts', [$this, 'inject_collector_script']);
            add_action('woocommerce_review_order_before_submit', [$this, 'inject_visitor_id_field']);
            add_action('woocommerce_checkout_order_processed', [$this, 'save_visitor_id_to_order']);
            add_action('woocommerce_checkout_order_processed', [$this, 'link_order_to_checkout_signals'], 20);
        }

        public function inject_collector_script() {
            $merchant_id = get_option('unauth_merchant_id');
            if (!$merchant_id) {
                return;
            }

            wp_enqueue_script(
                'unauth-collector',
                'https://app.unauth.co/collector.js',
                [],
                UNAUTH_VERSION,
                true
            );

            wp_add_inline_script(
                'unauth-collector',
                sprintf(
                    'window.UnauthCollector && window.UnauthCollector.init({ merchantId: "%s", platform: "woocommerce", endpoint: "https://app.unauth.co/api/checkout-signals/ingest" });',
                    esc_js($merchant_id)
                ),
                'after'
            );
        }

        public function inject_visitor_id_field() {
            echo '<input type="hidden" name="_unauth_vid" id="_unauth_vid" value="">';
            echo '<script>(function(){var vid=document.cookie.match(/_unauth_vid=([^;]+)/);var el=document.getElementById("_unauth_vid");if(vid&&el){el.value=decodeURIComponent(vid[1]);}})();</script>';
        }

        public function save_visitor_id_to_order($order_id) {
            if (empty($_POST['_unauth_vid'])) {
                return;
            }

            $vid = sanitize_text_field(wp_unslash($_POST['_unauth_vid']));
            if (preg_match('/^[0-9a-f\-]{36}$/i', $vid)) {
                update_post_meta($order_id, '_unauth_visitor_id', $vid);
            }
        }

        public function link_order_to_checkout_signals($order_id) {
            $visitor_id = get_post_meta($order_id, '_unauth_visitor_id', true);
            if (!$visitor_id) {
                return;
            }

            $merchant_id = get_option('unauth_merchant_id');
            $api_key = get_option('unauth_api_key');
            if (!$merchant_id || !$api_key) {
                return;
            }

            wp_remote_post('https://app.unauth.co/api/checkout-signals/link-order', [
                'body' => wp_json_encode([
                    'orderId' => (string) $order_id,
                    'merchantId' => $merchant_id,
                    'visitorId' => $visitor_id,
                    'platform' => 'woocommerce',
                ]),
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-Unauth-Key' => $api_key,
                ],
                'blocking' => false,
            ]);
        }
    }
}
