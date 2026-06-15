(function() {
    window.SUPABASE_PAYMENT_URL = 'https://xjtkatmixfhxllummglk.supabase.co/functions/v1/misticpay-gateway'; 
    const WHATSAPP_NUMERO_LOJA = '5596991557184';

    if (window.paymentPollingInterval) clearInterval(window.paymentPollingInterval);
    window.paymentPollingInterval = null;
    window.ultimoPedidoGerado = null;

    async function executarGeracaoPix(metodo, pedidoInfo) {
        const gateway = metodo === 'pix2' ? 'mercadopago' : 'misticpay';
        
        const payload = {
            amount: Number(pedidoInfo.total),
            payerName: pedidoInfo.clienteNome || 'Cliente JARDSON IMPORTS',
            payerDocument: '00000000000',
            payerEmail: pedidoInfo.clienteEmail || 'comprador@email.com',
            transactionId: `pedido_${pedidoInfo.numero}_${Date.now()}`,
            description: `Pedido #${pedidoInfo.numero} - JARDSON IMPORTS`
        };

        const response = await fetch(window.SUPABASE_PAYMENT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', payload: payload, gateway: gateway })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error_detail || result.message || result.error || 'Erro ao gerar pagamento');
        }

        if (gateway === 'mercadopago') {
            const txData = result.point_of_interaction.transaction_data;
            return {
                id: String(result.id),
                qr_code_base64: txData.qr_code_base64,
                copy_paste: txData.qr_code,
                gateway: 'mercadopago'
            };
        } else {
            return {
                id: result.data.transactionId,
                qr_code_base64: result.data.qrCodeBase64.includes('base64,') ? result.data.qrCodeBase64.split('base64,')[1] : result.data.qrCodeBase64,
                copy_paste: result.data.copyPaste,
                gateway: 'misticpay'
            };
        }
    }

    async function consultarStatus(transactionId, gateway) {
        try {
            const body = { 
                action: 'check', 
                payload: { transactionId: transactionId, paymentId: transactionId }, 
                gateway: gateway 
            };

            const response = await fetch(window.SUPABASE_PAYMENT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json();

            if (gateway === 'mercadopago') {
                if (response.ok && result.status === 'approved') return 'COMPLETO';
                if (response.ok && (result.status === 'rejected' || result.status === 'cancelled')) return 'FALHA';
            } else {
                if (response.ok && result.transaction) return result.transaction.transactionState;
            }
            return null;
        } catch (e) { return null; }
    }

    window.finalizarPedido = function() {
        if (!user) { openModal('profile-modal'); return; }
        if (cart.length === 0) { alert("Sua sacola está vazia!"); return; }

        window.ultimoPedidoGerado = {
            numero: Math.floor(Math.random() * 9000 + 1000),
            total: cart.reduce((a, b) => a + b.price, 0),
            clienteNome: user.nome,
            clienteEmail: user.email || 'comprador@email.com',
            endereco: user.rua,
            numeroEndereco: user.num,
            bairro: user.bairro,
            cidade: user.cidade || '',
            itens: JSON.parse(JSON.stringify(cart))
        };

        renderizarPaginaSelecao(window.ultimoPedidoGerado, window.scrollY);
    };

    function renderizarPaginaSelecao(pedidoInfo, scrollPos) {
        const page = document.createElement('div');
        page.id = 'checkout-page-container';
        page.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:#ffffff;z-index:9999999;overflow-y:auto;font-family:'Plus Jakarta Sans', sans-serif;";

        const itensHTML = pedidoInfo.itens.map(item => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                <div style="flex:1;padding-right:10px;">
                    <p style="font-size:13px;font-weight:800;color:#000;margin:0;line-height:1.2;">${item.name}</p>
                </div>
                <p style="font-size:13px;font-weight:800;color:#FF8C00;margin:0;white-space:nowrap;">R$ ${item.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
        `).join('');

        page.innerHTML = `
            <div style="width:100%;max-width:500px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;background:#ffffff;">
                <header style="padding:15px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;position:sticky;top:0;background:white;z-index:10;">
                    <button onclick="fecharPaginaPagamento(${scrollPos})" style="background:none;border:none;font-size:20px;color:#000;cursor:pointer;padding:5px;"><i class="fa-solid fa-arrow-left"></i></button>
                    <div style="text-align:center;"><h1 style="font-size:18px;font-weight:900;color:#FF8C00;margin:0;letter-spacing:-1px;">JARDSON IMPORTS</h1></div>
                    <div style="width:30px;"></div>
                </header>

                <div id="checkout-main-content" style="padding:20px;animation:fadeIn 0.4s ease-out;">
                    <p style="font-size:14px;font-weight:900;color:#000;margin-bottom:15px;">Escolha a forma de pagamento:</p>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:25px;">
                        
                        <div onclick="processarPagamento('pix1')" style="padding:15px;border:1px solid #E2E8F0;border-radius:15px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:#FFF;transition:0.2s;">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div style="width:24px;height:24px;border:2px solid #E2E8F0;border-radius:50%;"></div>
                                <span style="font-size:14px;font-weight:800;color:#000;">Pix 1 — JARDSON IMPORTS</span>
                            </div>
                            <img src="https://logopng.com.br/logos/pix-106.png" style="height:18px;">
                        </div>

                        <div onclick="processarPagamento('pix2')" style="padding:15px;border:1px solid #E2E8F0;border-radius:15px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:#FFF;transition:0.2s;">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div style="width:24px;height:24px;border:2px solid #E2E8F0;border-radius:50%;"></div>
                                <span style="font-size:14px;font-weight:800;color:#000;">Pix 2 — Mercado Pago</span>
                            </div>
                            <img src="https://logopng.com.br/logos/pix-106.png" style="height:18px;">
                        </div>

                        <div onclick="window.solicitarPagamentoCartao()" style="padding:15px;border:1px solid #E2E8F0;border-radius:15px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:#FFF;">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div style="width:24px;height:24px;border:2px solid #E2E8F0;border-radius:50%;"></div>
                                <span style="font-size:14px;font-weight:800;color:#000;">Pagar com Cartão</span>
                            </div>
                            <div style="display:flex;gap:4px;">
                                <i class="fa-brands fa-cc-visa" style="color:#1A1F71;font-size:20px;"></i>
                                <i class="fa-brands fa-cc-mastercard" style="color:#EB001B;font-size:20px;"></i>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:25px;">
                        <h4 style="font-size:14px;font-weight:900;color:#000;margin-bottom:12px;">Resumo do Pedido</h4>
                        <div style="background:#f8fafc;padding:5px 15px;border-radius:20px;border:1px solid #f1f5f9;">
                            ${itensHTML}
                            <div style="padding:15px 0;text-align:right;">
                                <p style="font-size:18px;font-weight:900;color:#000;margin:0;">Total: R$ ${pedidoInfo.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
        `;
        document.body.appendChild(page);
    }
    
    function mostrarAvisoLimitePix() {
        const modal = document.createElement('div');
        modal.id = 'modal-aviso-premium';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(5px);z-index:10000000;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Plus Jakarta Sans', sans-serif;animation:fadeIn 0.3s ease-out;";
        
        modal.innerHTML = `
            <div style="background:#ffffff;width:100%;max-width:400px;border-radius:30px;padding:35px 25px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.2);animation:slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width:70px;height:70px;background:#FFF4E5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 25px;border:2px solid #FFB020;">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#FFB020;font-size:30px;"></i>
                </div>
                <h3 style="font-size:22px;font-weight:900;color:#000;margin-bottom:15px;letter-spacing:-0.5px;">LIMITE EXCEDIDO</h3>
                <p style="font-size:15px;color:#64748b;font-weight:600;line-height:1.6;margin-bottom:25px;">
                    O valor máximo para depósito no <span style="color:#FF8C00;font-weight:800;">Pix 1</span> é <span style="color:#000;font-weight:800;">R$ 1.000,00</span>.<br><br>
                    Para pagamentos acima deste valor, use a opção do <span style="color:#FF8C00;font-weight:800;">Mercado Pago (Pix 2)</span>.
                </p>
                <div style="background:#FFF4E5;padding:12px;border-radius:15px;margin-bottom:25px;display:flex;align-items:center;justify-content:center;gap:10px;">
                    <div class="mini-loader"></div>
                    <span style="font-size:13px;color:#FF8C00;font-weight:800;">REDIRECIONANDO...</span>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .mini-loader { width: 16px; height: 16px; border: 3px solid #FFF4E5; border-top: 3px solid #FF8C00; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(modal);

        setTimeout(() => {
            modal.style.opacity = '0';
            modal.style.transition = '0.3s';
            setTimeout(() => {
                modal.remove();
                window.processarPagamento('pix2');
            }, 300);
        }, 3500);
    }

    window.processarPagamento = async function(metodo) {
        const mainContent = document.getElementById('checkout-main-content');
        const pedidoInfo = window.ultimoPedidoGerado;

        if (metodo === 'pix1' && pedidoInfo.total > 1000) {
            mostrarAvisoLimitePix();
            return;
        }

        mainContent.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 0;">
                <div class="shop-loader"></div>
                <h2 style="color:#FF8C00;font-weight:900;font-size:20px;margin-top:25px;letter-spacing:-0.5px;">PROCESSANDO...</h2>
                <p style="color:#64748b;font-size:14px;margin-top:8px;font-weight:600;">Gerando seu Pix com segurança</p>
                <style>
                    .shop-loader { width: 45px; height: 45px; border: 4px solid #f1f5f9; border-top: 4px solid #FF8C00; border-radius: 50%; animation: spin 0.8s linear infinite; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </div>
        `;

        try {
            const pixData = await executarGeracaoPix(metodo, pedidoInfo);
            renderizarAreaPix(pixData, pedidoInfo);
            iniciarMonitoramento(pixData.id, pixData.gateway, pedidoInfo);
        } catch (error) {
            alert("Erro: " + error.message);
            location.reload();
        }
    };

    function renderizarAreaPix(pixData, pedidoInfo) {
        const mainContent = document.getElementById('checkout-main-content');
        const label = pixData.gateway === 'mercadopago' ? 'Pix 2 — Mercado Pago' : 'Pix 1 — JARDSON IMPORTS';

        mainContent.innerHTML = `
            <div style="text-align:center;margin-bottom:25px;animation:fadeIn 0.4s ease-out;">
                <div style="background:#FFF4E5;color:#FF8C00;padding:8px 15px;border-radius:100px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:8px;border:1px solid #FFB020;">
                    <div class="dot-blink"></div> AGUARDANDO PAGAMENTO
                </div>
            </div>

            <div style="background:#ffffff;border-radius:25px;padding:25px;margin-bottom:25px;border:1px solid #f1f5f9;box-shadow:0 10px 30px rgba(0,0,0,0.03);text-align:center;">
                <p style="font-size:11px;font-weight:800;color:#FF8C00;margin-bottom:12px;text-transform:uppercase;">${label}</p>
                <div style="background:#f8fafc;padding:15px;border-radius:20px;display:inline-block;margin-bottom:15px;border:1px solid #f1f5f9;">
                    <img src="data:image/png;base64,${pixData.qr_code_base64}" style="width:200px;height:200px;display:block;">
                </div>
                <div>
                    <p style="font-size:11px;font-weight:700;color:#666;text-transform:uppercase;margin-bottom:5px;">Total do Pedido</p>
                    <p style="font-size:28px;font-weight:900;color:#000;margin:0;letter-spacing:-1px;">R$ ${pedidoInfo.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
            </div>

            <div style="margin-bottom:25px;">
                <p style="font-size:12px;font-weight:800;color:#000;margin-bottom:12px;text-align:left;">Código Pix (Copia e Cola):</p>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="pix-copy-paste" value="${pixData.copy_paste}" readonly style="flex:1;padding:15px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:13px;color:#000;outline:none;font-weight:700;text-overflow:ellipsis;">
                    <button onclick="copiarPix()" style="padding:0 20px;background:#FF8C00;color:white;border:none;border-radius:12px;font-weight:800;font-size:13px;cursor:pointer;">COPIAR</button>
                </div>
            </div>

            <div style="background:#F8FAFC;padding:20px;border-radius:20px;text-align:center;border:1px solid #E2E8F0;">
                <p style="font-size:13px;color:#64748b;font-weight:600;line-height:1.5;margin:0;">
                    Após realizar o pagamento, aguarde nesta tela.<br>A confirmação é automática e instantânea.
                </p>
            </div>

            <style>
                .dot-blink { width: 8px; height: 8px; background: #FF8C00; border-radius: 50%; animation: blink 1s infinite; }
                @keyframes blink { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
            </style>
        `;
    }

    function iniciarMonitoramento(id, gateway, info) {
        if (window.paymentPollingInterval) clearInterval(window.paymentPollingInterval);
        window.paymentPollingInterval = setInterval(async () => {
            const status = await consultarStatus(id, gateway);
            if (status === 'COMPLETO') {
                clearInterval(window.paymentPollingInterval);
                try {
                    await _supabase.from('pedidos').insert([{
                        usuario_id: user.id, itens: info.itens, total: info.total, pago: true, entregue: false,
                        endereco: info.endereco, numeroEndereco: info.numeroEndereco, bairro: info.bairro, cidade: info.cidade
                    }]);
                } catch (e) { console.error('Erro ao salvar:', e); }

                const mainContent = document.getElementById('checkout-main-content');
                if (mainContent) {
                    mainContent.innerHTML = `
                        <div style="text-align:center;animation:fadeIn 0.5s ease-out;padding:20px 0;">
                            <div style="width:80px;height:80px;background:#00C853;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 25px;box-shadow:0 10px 25px rgba(0,200,83,0.3);">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 style="color:#000;font-weight:900;font-size:26px;margin-bottom:12px;letter-spacing:-1px;">PAGAMENTO APROVADO!</h2>
                            <p style="color:#00C853;font-size:16px;margin-bottom:25px;font-weight:800;">Recebemos seu pagamento com sucesso.</p>
                            
                            <div style="background:#F0FFF4;padding:25px;border-radius:20px;border:1px solid #C6F6D5;margin-bottom:30px;text-align:center;">
                                <p style="font-size:15px;color:#22543D;font-weight:700;line-height:1.6;margin:0;">
                                    Nosso time já foi notificado e seu pedido entrará em separação em breve! Ja ja está na sua casa.
                                </p>
                            </div>

                            <button onclick="location.reload()" style="width:100%;padding:18px;background:#FF8C00;color:white;border:none;border-radius:15px;font-weight:900;font-size:16px;cursor:pointer;box-shadow:0 10px 20px rgba(255,140,0,0.2);">
                                 VOLTAR PARA A LOJA
                            </button>
                        </div>
                    `;
                }
            } else if (status === 'FALHA') {
                clearInterval(window.paymentPollingInterval);
                alert("O pagamento falhou. Por favor, tente novamente.");
                location.reload();
            }
        }, 4000);
    }

    window.fecharPaginaPagamento = function(scrollPos) {
        const container = document.getElementById('checkout-page-container');
        if (container) container.remove();
        if (window.paymentPollingInterval) clearInterval(window.paymentPollingInterval);
        window.scrollTo(0, scrollPos);
    };

    window.solicitarPagamentoCartao = function() {
        const info = window.ultimoPedidoGerado || { numero: 'N/A' };
        window.open(`https://wa.me/${WHATSAPP_NUMERO_LOJA}?text=Olá! Gostaria de realizar o pagamento do meu pedido utilizando cartão de crédito #${info.numero} Poderia me enviar o link para pagamento, por favor?`, '_blank');
    };

    window.copiarPix = function() {
        const input = document.getElementById('pix-copy-paste');
        input.select();
        navigator.clipboard.writeText(input.value);
        event.target.innerText = "COPIADO!";
        setTimeout(() => { event.target.innerText = "COPIAR"; }, 2000);
    };

})();
