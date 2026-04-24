/**
 * Bot de Integração Mercado Pago Pix para Jardson Imports
 * Este script deve ser adicionado ao final do <body> no index.html
 */

const MERCADO_PAGO_CONFIG = {
    accessToken: 'APP_USR-4465226908881082-090910-090590e8c08f7176e03bc7945674d415-2657497583',
    endpoint: 'https://api.mercadopago.com/v1/payments'
};

// Função para gerar o pagamento Pix via Mercado Pago
async function gerarPixMercadoPago(pedidoInfo) {
    const paymentData = {
        transaction_amount: pedidoInfo.total,
        description: `Pedido #${pedidoInfo.numero} - Jardson Imports`,
        payment_method_id: 'pix',
        payer: {
            email: 'mcskmcs06@gmail.com', // Opcional: capturar do usuário se necessário
            first_name: pedidoInfo.clienteNome.split(' ')[0],
            last_name: pedidoInfo.clienteNome.split(' ').slice(1).join(' ') || 'Cliente',
            identification: {
                type: 'CPF',
                number: '9775147204' // CPF genérico para teste, o MP exige um CPF válido em produção
            },
            address: {
                zip_code: '68920000',
                street_name: pedidoInfo.endereco,
                street_number: pedidoInfo.numeroEndereco,
                neighborhood: pedidoInfo.bairro,
                city: 'Laranjal do Jari',
                federal_unit: 'AP'
            }
        }
    };

    try {
        const response = await fetch(MERCADO_PAGO_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MERCADO_PAGO_CONFIG.accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `pedido_${pedidoInfo.numero}_${Date.now()}`
            },
            body: JSON.stringify(paymentData)
        });

        const data = await response.json();

        if (response.ok) {
            return {
                qr_code: data.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
                copy_paste: data.point_of_interaction.transaction_data.qr_code,
                ticket_url: data.point_of_interaction.transaction_data.ticket_url
            };
        } else {
            console.error('Erro Mercado Pago:', data);
            throw new Error(data.message || 'Erro ao gerar Pix');
        }
    } catch (error) {
        console.error('Erro na requisição Pix:', error);
        throw error;
    }
}

// Intercepta a função original de finalizar pedido
const originalFinalizarPedido = window.finalizarPedido;

window.finalizarPedido = async function() {
    if (!user) { openModal('profile-modal'); return; }
    if (cart.length === 0) { alert("Sua sacola está vazia!"); return; }

    const total = cart.reduce((a, b) => a + b.price, 0);
    const numeroPedido = Math.floor(Math.random() * 9000 + 1000);

    // Criar overlay de carregamento
    const loader = document.createElement('div');
    loader.id = 'pix-loader';
    loader.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:sans-serif;padding:20px;text-align:center;">
            <div style="width:50px;height:50px;border:5px solid #f3f3f3;border-top:5px solid #ee4d2d;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px;"></div>
            <h2 style="font-weight:bold;font-size:18px;">Gerando seu PIX...</h2>
            <p style="font-size:14px;margin-top:10px;">Aguarde um instante.</p>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(loader);

    try {
        const pedidoInfo = {
            numero: numeroPedido,
            total: total,
            clienteNome: user.nome,
            endereco: user.rua,
            numeroEndereco: user.num,
            bairro: user.bairro
        };

        const pixData = await gerarPixMercadoPago(pedidoInfo);
        
        // Remove loader
        document.getElementById('pix-loader').remove();

        // Mostrar Modal do Pix
        mostrarModalPix(pixData, pedidoInfo);

    } catch (error) {
        document.getElementById('pix-loader').remove();
        alert("Erro ao gerar pagamento Pix. Tente novamente ou finalize pelo WhatsApp.");
        // Fallback para o WhatsApp original se o Pix falhar
        originalFinalizarPedido();
    }
};

function mostrarModalPix(pixData, pedidoInfo) {
    const modalPix = document.createElement('div');
    modalPix.id = 'modal-pix-display';
    modalPix.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:10000;overflow-y:auto;padding:20px;font-family:'Plus Jakarta Sans', sans-serif;";
    
    modalPix.innerHTML = `
        <div style="max-width:400px;margin:0 auto;text-align:center;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;">
                <h2 style="font-weight:900;font-size:24px;color:#1a1a1a;">PAGAMENTO <span style="color:#ee4d2d;">PIX</span></h2>
                <button onclick="document.getElementById('modal-pix-display').remove()" style="background:#f3f4f6;border:none;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;">&times;</button>
            </div>

            <div style="background:#f8f9fa;padding:20px;border-radius:24px;border:1px solid #eee;margin-bottom:20px;">
                <p style="font-size:12px;font-weight:bold;color:#666;text-transform:uppercase;margin-bottom:5px;">Total do Pedido #${pedidoInfo.numero}</p>
                <h3 style="font-size:32px;font-weight:900;color:#ee4d2d;">R$ ${pedidoInfo.total.toLocaleString('pt-br', {minimumFractionDigits: 2})}</h3>
            </div>

            <p style="font-size:14px;color:#666;margin-bottom:20px;">Escaneie o QR Code abaixo ou copie o código para pagar.</p>
            
            <img src="data:image/png;base64,${pixData.qr_code_base64}" style="width:200px;height:200px;margin:0 auto 20px;display:block;border:1px solid #eee;padding:10px;border-radius:12px;">

            <div style="margin-bottom:30px;">
                <label style="display:block;font-size:10px;font-weight:900;color:#999;text-transform:uppercase;margin-bottom:8px;">Código Pix (Copia e Cola)</label>
                <textarea id="pix-copy-paste" readonly style="width:100%;height:80px;background:#f8f9fa;border:2px dashed #ddd;border-radius:12px;padding:10px;font-size:11px;color:#444;resize:none;margin-bottom:10px;">${pixData.copy_paste}</textarea>
                <button onclick="copyPixCode()" id="btn-copy-pix" style="width:100%;padding:15px;background:#000;color:white;border:none;border-radius:16px;font-weight:bold;cursor:pointer;transition:0.3s;">COPIAR CÓDIGO</button>
            </div>

            <div style="background:#e8f5e9;padding:15px;border-radius:16px;margin-bottom:30px;">
                <p style="font-size:12px;color:#2e7d32;font-weight:bold;">Após pagar, clique no botão abaixo para enviar o comprovante no WhatsApp.</p>
            </div>

            <button onclick="enviarWhatsappComPix('${pedidoInfo.numero}', '${pedidoInfo.total}')" style="width:100%;padding:18px;background:#25D366;color:white;border:none;border-radius:20px;font-weight:900;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 10px 20px rgba(37,211,102,0.2);">
                <i class="fa-brands fa-whatsapp"></i> JÁ PAGUEI, ENVIAR PEDIDO
            </button>
        </div>
    `;
    
    document.body.appendChild(modalPix);
}

// Funções utilitárias globais para o modal
window.copyPixCode = function() {
    const copyText = document.getElementById("pix-copy-paste");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    
    const btn = document.getElementById("btn-copy-pix");
    btn.innerText = "CÓDIGO COPIADO!";
    btn.style.background = "#2e7d32";
    setTimeout(() => {
        btn.innerText = "COPIAR CÓDIGO";
        btn.style.background = "#000";
    }, 2000);
};

window.enviarWhatsappComPix = function(numero, total) {
    const today = new Date();
    const dataPedido = today.toLocaleDateString('pt-BR');
    const horaPedido = today.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    
    let msg = `🚀 *NOVO PEDIDO PAGO (PIX) - JARDSON IMPORTS*\n\n`;
    msg += `📅 *DATA:* ${dataPedido}\n`;
    msg += `⏰ *HORA:* ${horaPedido}\n`;
    msg += `🆔 *Nº DO PEDIDO:* #${numero}\n\n`;
    msg += `📦 *ITENS DO PEDIDO:*\n`;
    cart.forEach(p => {
        msg += `• ${p.name} - R$ ${p.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    });
    msg += `\n💰 *TOTAL PAGO:* R$ ${parseFloat(total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    msg += `💳 *FORMA DE PAGAMENTO:* PIX (GERADO AUTOMATICAMENTE)\n\n`;
    msg += `🚚 *DADOS DE ENTREGA:*\n`;
    msg += `${user.nome}\n`;
    msg += `${user.rua}, ${user.num} - ${user.bairro}\n\n`;
    msg += `✅ *O pagamento já foi realizado, aguardo o envio!*`;
    
    const waLink = `https://wa.me/${whatsappLoja}?text=${encodeURIComponent(msg)}`;
    window.open(waLink, "_blank");
    
    // Limpa o carrinho e fecha os modais
    cart = [];
    updateCartUI();
    document.getElementById('modal-pix-display').remove();
    closeAllModals();
};
