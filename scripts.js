      // --------- Utility functions ----------
      function round(value, decimals) {
        // Corrige problema de arredondamento do JS (e.g., 1.005 para 1 ao invés de 1.01)
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
    
    function formatCurrency(value) {
        // Verifica se é um número antes de formatar
        if (isNaN(value) || value === null) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    function formatNumber(value, decimals = 2) {
        if (isNaN(value) || value === null) return '0,00';
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }
    
    function formatCompactNumber(value) {
        const absValue = Math.abs(value);
        if (isNaN(value) || value === null) return '0';
        if (absValue >= 1_000_000_000) {
            return (value / 1_000_000_000).toFixed(1).replace('.', ',') + 'B';
        } else if (absValue >= 1_000_000) {
            return (value / 1_000_000).toFixed(1).replace('.', ',') + 'M';
        } else if (absValue >= 1000) {
            return (value / 1000).toFixed(1).replace('.', ',') + 'K';
        }
        return String(Math.floor(value)); // Não formata abaixo de 1000
    }
    
    // Formata valor monetário enquanto digita ou no blur
    function handleMoneyInput(event, allowDecimal = true) {
        const input = event.target;
        let value = input.value.replace(/\D/g, ''); // Remove tudo não dígito
        let numericValue;
    
        if (!value) {
            input.dataset.rawValue = '0';
            input.value = allowDecimal ? '0,00' : '0';
            return;
        }
    
        if (allowDecimal) {
            // Adiciona zeros à esquerda se necessário para formar centavos
            if (value.length < 3) {
                value = value.padStart(3, '0');
            }
            numericValue = parseInt(value, 10) / 100;
        } else {
            numericValue = parseInt(value, 10);
        }
    
        input.dataset.rawValue = numericValue; // Armazena o valor numérico puro
    
        input.value = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: allowDecimal ? 2 : 0,
            maximumFractionDigits: allowDecimal ? 2 : 0,
        }).format(numericValue);
    }
    
    // Formata porcentagem com 2 decimais
    function handlePercentageInput(event) {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        let numericValue;
    
        if (!value) {
            input.dataset.rawValue = '0';
            input.value = '0,00';
            return;
        }
    
        // Limita a 100.00% (5 dígitos: 10000)
        if (value.length > 5) {
            value = value.slice(0, 5);
        }
    
        // Adiciona zeros à esquerda se necessário
        if (value.length < 3) {
            value = value.padStart(3, '0');
        }
    
        numericValue = parseInt(value, 10) / 100;
    
        if (numericValue > 100) {
            numericValue = 100;
            value = '10000'; // Atualiza o valor base
        }
    
        input.dataset.rawValue = numericValue;
    
        input.value = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericValue);
    }
    
    // Formata input numérico inteiro (sem decimais)
    function handleIntegerInput(event, maxLength = null) {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
    
        if (maxLength && value.length > maxLength) {
            value = value.slice(0, maxLength);
        }
    
        const numericValue = parseInt(value, 10) || 0;
        input.dataset.rawValue = numericValue;
        input.value = value; // Exibe apenas os dígitos
    }
    
    // Formata input numérico inteiro para % (até 100)
    function handleIntegerPercentInput(event) {
        handleIntegerInput(event, 3); // Max 3 digitos (100)
        const value = parseInt(event.target.value.replace(/\D/g, ''), 10) || 0;
        if (value > 100) {
            event.target.value = '100';
            event.target.dataset.rawValue = 100;
        }
    }
    
    // --------- APLICAR FORMATAÇÃO AOS CAMPOS FIXOS ----------
    document.getElementById('gastos').addEventListener('input', (e) => handleMoneyInput(e, true));
    document.getElementById('gastos').addEventListener('blur', (e) => handleMoneyInput(e, true));
    
    document.getElementById('ticket').addEventListener('input', (e) => handleMoneyInput(e, true));
    document.getElementById('ticket').addEventListener('blur', (e) => handleMoneyInput(e, true));
    
    document.getElementById('valorDescontado').addEventListener('input', (e) => handleMoneyInput(e, true));
    document.getElementById('valorDescontado').addEventListener('blur', (e) => handleMoneyInput(e, true));
    
    // REMOVIDOS: Event listeners dos pós-sells fixos
    // document.getElementById('posSellValor').addEventListener('input', (e) => handleMoneyInput(e, true));
    // document.getElementById('posSellValor').addEventListener('blur', (e) => handleMoneyInput(e, true));
    // document.getElementById('posSellPercent').addEventListener('input', (e) => handleIntegerInput(e, 3));
    // document.getElementById('posSellPercent').addEventListener('blur', (e) => { ... });
    
    document.getElementById('taxas').addEventListener('input', handlePercentageInput);
    document.getElementById('taxas').addEventListener('blur', handlePercentageInput);
    
    document.getElementById('dias').addEventListener('input', (e) => handleIntegerInput(e, 3));
    document.getElementById('dias').addEventListener('blur', (e) => { // Garante que não fique vazio
        if (!e.target.value) e.target.value = '1';
        handleIntegerInput(e, 3);
    });
    
    // --------- LÓGICA DE PÓS-SELLS DINÂMICOS ----------
    const numPosSellsSelect = document.getElementById('numPosSells');
    const posSellInputsContainer = document.getElementById('posSellInputsContainer');
    const posSellsDataInput = document.getElementById('posSellsData');
    let currentPosSellData = []; // Array para guardar dados [{percent: X, valor: Y}, ...]
    
    function generatePosSellInputs(count, savedData = []) {
        posSellInputsContainer.innerHTML = ''; // Limpa container
    
        // Não resetamos os dados atuais, preservamos o que já existe
        // currentPosSellData = []; // Removido para preservar os dados existentes
    
        if (count > 0 && !posSellInputsContainer.classList.contains('has-border')) {
            posSellInputsContainer.style.borderBottom = '1px solid var(--input-border)';
            posSellInputsContainer.style.paddingBottom = '1rem';
            posSellInputsContainer.classList.add('has-border');
        } else if (count === 0) {
            posSellInputsContainer.style.borderBottom = 'none';
            posSellInputsContainer.style.paddingBottom = '0';
            posSellInputsContainer.classList.remove('has-border');
        }
    
    
        for (let i = 1; i <= count; i++) {
            // Usa dados salvos, ou dados atuais (se existirem) ou default
            const savedItem = savedData[i - 1] || currentPosSellData[i - 1] || {
                percent: 0,
                valor: 0
            };
    
            // Cria grupo para conversão
            const percentGroup = document.createElement('div');
            percentGroup.className = 'pos-sell-group'; // Use a nova classe
    
            const percentLabel = document.createElement('label');
            percentLabel.htmlFor = `posSellPercent_${i}`;
            percentLabel.textContent = `Conversão PS ${i}`;
            percentGroup.appendChild(percentLabel);
    
            const percentInputDiv = document.createElement('div');
            percentInputDiv.className = 'input-group suffix no-prefix';
    
            const percentInput = document.createElement('input');
            percentInput.type = 'text';
            percentInput.id = `posSellPercent_${i}`;
            percentInput.name = `posSellPercent_${i}`;
            percentInput.placeholder = '0';
            percentInput.inputMode = 'numeric';
            percentInput.maxLength = 3;
            percentInput.dataset.index = i - 1; // Guardar índice para salvar
            percentInput.value = savedItem.percent || ''; // Carrega valor salvo
            percentInput.addEventListener('input', handleIntegerPercentInput); // Aplica formatação
            percentInput.addEventListener('blur', handleIntegerPercentInput); // Aplica no blur tbm
            percentInputDiv.appendChild(percentInput);
    
            const percentSuffix = document.createElement('span');
            percentSuffix.className = 'input-suffix';
            percentSuffix.textContent = '%';
            percentInputDiv.appendChild(percentSuffix);
    
            percentGroup.appendChild(percentInputDiv);
            posSellInputsContainer.appendChild(percentGroup);
    
            // Trigger blur para formatar valor carregado, se houver
            if (percentInput.value) {
                percentInput.dispatchEvent(new Event('blur'));
            }
    
    
            // Cria grupo para valor
            const valorGroup = document.createElement('div');
            valorGroup.className = 'pos-sell-group'; // Use a nova classe
    
            const valorLabel = document.createElement('label');
            valorLabel.htmlFor = `posSellValor_${i}`;
            valorLabel.textContent = `Ticket PS ${i}`;
            valorGroup.appendChild(valorLabel);
    
            const valorInputDiv = document.createElement('div');
            valorInputDiv.className = 'input-group prefix';
    
            const valorPrefix = document.createElement('span');
            valorPrefix.className = 'input-prefix';
            valorPrefix.textContent = 'R$';
            valorInputDiv.appendChild(valorPrefix);
    
            const valorInput = document.createElement('input');
            valorInput.type = 'text';
            valorInput.id = `posSellValor_${i}`;
            valorInput.name = `posSellValor_${i}`;
            valorInput.placeholder = '0,00';
            valorInput.inputMode = 'numeric';
            valorInput.dataset.index = i - 1; // Guardar índice para salvar
            valorInput.value = savedItem.valor ? formatNumber(savedItem.valor, 2) : '';
            valorInput.addEventListener('input', (e) => handleMoneyInput(e, true)); // Aplica formatação
            valorInput.addEventListener('blur', (e) => handleMoneyInput(e, true)); // Aplica no blur tbm
            valorInputDiv.appendChild(valorInput);
    
            valorGroup.appendChild(valorInputDiv);
            posSellInputsContainer.appendChild(valorGroup);
    
            // Trigger blur para formatar valor carregado
            valorInput.dispatchEvent(new Event('blur'));
    
            // Inicializa dados no array currentPosSellData
            currentPosSellData[i - 1] = {
                percent: parseInt(percentInput.dataset.rawValue || '0', 10),
                valor: parseFloat(valorInput.dataset.rawValue || '0')
            };
    
            // Adiciona listeners para atualizar currentPosSellData e salvar no localStorage
            percentInput.addEventListener('change', updateAndSavePosSellData);
            valorInput.addEventListener('change', updateAndSavePosSellData);
        }
    
        // Salva o estado inicial (com valores carregados)
        updateAndSavePosSellData();
    }
    
    function updateAndSavePosSellData() {
        const count = parseInt(numPosSellsSelect.value, 10);
    
        // Se count > 0, atualizamos os dados com os valores dos inputs
        if (count > 0) {
            // Recria array apenas para os inputs visíveis atualmente
            const newPosSellData = [];
            for (let i = 1; i <= count; i++) {
                const percentInput = document.getElementById(`posSellPercent_${i}`);
                const valorInput = document.getElementById(`posSellValor_${i}`);
                newPosSellData.push({
                    percent: parseInt(percentInput?.dataset.rawValue || '0', 10),
                    valor: parseFloat(valorInput?.dataset.rawValue || '0')
                });
            }
    
            // Atualiza apenas os dados dos pós-sells visíveis, mantendo os outros
            for (let i = 0; i < newPosSellData.length; i++) {
                if (i < currentPosSellData.length) {
                    // Atualiza dados existentes
                    currentPosSellData[i] = newPosSellData[i];
                } else {
                    // Adiciona novos dados
                    currentPosSellData.push(newPosSellData[i]);
                }
            }
        }
    
        // Sempre salvamos o valor atual do currentPosSellData no hidden input,
        // independente de count ser zero ou não
        posSellsDataInput.value = JSON.stringify(currentPosSellData);
        // saveFormValues(); // Salva no localStorage // REMOVIDO: Não salvar mais aqui
    }
    
    
    // Event listener para o select de número de pós-sells
    numPosSellsSelect.addEventListener('change', (event) => {
        const count = parseInt(event.target.value, 10);
        // Tenta carregar dados existentes, se houver, para a nova quantidade
        // Primeiro tentamos pegar dos dados armazenados em posSellsDataInput
        const savedData = getSavedPosSellData();
        // Se o count for 0, ainda assim preservamos os dados para uso futuro
        // mas geramos 0 campos visíveis
        generatePosSellInputs(count, savedData);
    
        // Mesmo quando o usuário seleciona 0 pós-sells, garantimos que o hidden input
        // mantenha os dados para uso futuro
        if (count === 0) {
            // Não reconstruímos currentPosSellData quando count=0, mantemos o que já temos
            // Como generatePosSellInputs não apaga mais currentPosSellData, os dados são preservados
            // saveFormValues(); // REMOVIDO: Salva para garantir persistência
        }
    });
    
    function getSavedPosSellData() {
        try {
            return JSON.parse(posSellsDataInput.value || '[]');
        } catch (e) {
            console.error("Erro ao parsear dados de pós-sell salvos:", e);
            return [];
        }
    }
    
    
    // --------- CPA INPUT E LÓGICA DE MODO ----------
    let currentCpaMode = 'percentage'; // 'percentage' or 'fixed'
    let cpaValuesPercentage = [];
    let cpaValuesFixed = [];
    
    function setupCPAInput() {
        const input = document.getElementById('cpaInput');
        const inputGroup = document.getElementById('cpaInputGroup');
        const addBtn = document.getElementById('cpaAdd');
        const tagsContainer = document.getElementById('cpaTags');
        const modeButtons = document.querySelectorAll('.cpa-mode-btn');
        const hiddenModeInput = document.getElementById('cpaMode');
        const hiddenPercentageInput = document.getElementById('cpaPercentage');
        const hiddenFixedInput = document.getElementById('cpaFixed');
    
        // Carrega valores do localStorage (incluindo modo)
        loadCPADataFromStorage();
    
        // Define o estado inicial da UI com base no modo carregado
        updateCpaInputUI();
        renderTags();
    
        // Event listeners para botões de modo
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const newMode = button.dataset.mode;
                if (newMode !== currentCpaMode) {
                    currentCpaMode = newMode;
                    hiddenModeInput.value = currentCpaMode; // Atualiza hidden input do modo
                    updateCpaInputUI();
                    renderTags();
                    saveCPADataToStorage(); // Salva a mudança de modo
                }
            });
        });
    
        // Event delegation para remover tags
        tagsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('cpa-tag-remove')) {
                const tagElement = e.target.closest('.cpa-tag');
                const valueToRemove = parseFloat(tagElement.dataset.value);
                const typeToRemove = tagElement.dataset.type; // 'percentage' ou 'fixed'
    
                if (typeToRemove === 'percentage') {
                    cpaValuesPercentage = cpaValuesPercentage.filter(v => v !== valueToRemove);
                } else {
                    cpaValuesFixed = cpaValuesFixed.filter(v => v !== valueToRemove);
                }
                saveCPADataToStorage();
                renderTags(); // Re-renderiza as tags do modo atual
            }
        });
    
        // Event listener para adicionar CPA
        addBtn.addEventListener('click', handleAddCPA);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCPA();
            }
        });
    
        // Função para adicionar CPA (valida e adiciona à lista correta)
        function handleAddCPA() {
            const rawValue = input.value.trim();
            if (!rawValue) return;
    
            let numValue;
            let isValid = false;
    
            if (currentCpaMode === 'percentage') {
                numValue = parseInt(rawValue.replace(/\D/g, ''), 10); // Apenas inteiros para %
                if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
                    if (!cpaValuesPercentage.includes(numValue)) {
                        cpaValuesPercentage.push(numValue);
                        cpaValuesPercentage.sort((a, b) => a - b);
                        isValid = true;
                    }
                }
            } else { // Modo 'fixed'
                // Usa o valor formatado pelo handleMoneyInput, se disponível
                numValue = parseFloat(input.dataset.rawValue || rawValue.replace(/\./g, '').replace(',', '.'));
                if (!isNaN(numValue) && numValue > 0) {
                    // Arredonda para 2 casas decimais para consistência
                    numValue = round(numValue, 2);
                    if (!cpaValuesFixed.includes(numValue)) {
                        cpaValuesFixed.push(numValue);
                        cpaValuesFixed.sort((a, b) => a - b);
                        isValid = true;
                    }
                }
            }
    
            if (isValid) {
                saveCPADataToStorage();
                renderTags();
                input.value = ''; // Limpa input
                input.dataset.rawValue = ''; // Limpa valor raw
                input.focus();
            } else {
                // Adicionar feedback visual de erro se necessário
                input.style.borderColor = 'red';
                setTimeout(() => {
                    input.style.borderColor = '';
                }, 1000);
            }
        }
    
        // Atualiza a UI do input CPA (placeholder, prefixo/sufixo, formatação)
        function updateCpaInputUI() {
            modeButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === currentCpaMode);
            });
    
            // Limpa prefixo/sufixo existentes
            const existingPrefix = inputGroup.querySelector('.input-prefix');
            const existingSuffix = inputGroup.querySelector('.input-suffix');
            if (existingPrefix) existingPrefix.remove();
            if (existingSuffix) existingSuffix.remove();
            inputGroup.classList.remove('prefix', 'suffix', 'no-prefix'); // Limpa classes de layout
    
            // Remove event listeners antigos para evitar duplicação
            input.removeEventListener('input', handlePercentageCPAInput);
            input.removeEventListener('blur', handlePercentageCPAInput);
            input.removeEventListener('input', handleFixedCPAInput);
            input.removeEventListener('blur', handleFixedCPAInput);
    
    
            if (currentCpaMode === 'percentage') {
                input.placeholder = '50';
                input.maxLength = 3; // 100%
                input.inputMode = 'numeric';
                // Adiciona sufixo %
                const suffix = document.createElement('span');
                suffix.className = 'input-suffix';
                suffix.textContent = '%';
                inputGroup.appendChild(suffix);
                inputGroup.classList.add('suffix', 'no-prefix');
                // Aplica formatação de inteiro
                input.addEventListener('input', handlePercentageCPAInput);
                input.addEventListener('blur', handlePercentageCPAInput);
    
            } else { // Modo 'fixed'
                input.placeholder = '50,00';
                input.maxLength = 12; // Ajustar conforme necessário
                input.inputMode = 'decimal';
                // Adiciona prefixo R$
                const prefix = document.createElement('span');
                prefix.className = 'input-prefix';
                prefix.textContent = 'R$';
                inputGroup.appendChild(prefix);
                inputGroup.classList.add('prefix');
                // Aplica formatação de moeda
                input.addEventListener('input', handleFixedCPAInput);
                input.addEventListener('blur', handleFixedCPAInput);
            }
            input.value = ''; // Limpa o valor ao trocar de modo
            input.dataset.rawValue = '';
        }
    
        // Funções específicas de formatação para o input CPA
        function handlePercentageCPAInput(e) {
            handleIntegerInput(e, 3); // Max 3 digitos (100)
            const value = parseInt(e.target.value.replace(/\D/g, ''), 10);
            if (value > 100) {
                e.target.value = '100';
                e.target.dataset.rawValue = 100;
            }
        }
    
        function handleFixedCPAInput(e) {
            handleMoneyInput(e, true);
        }
    
    
        // Renderiza as tags de CPA com base no modo atual
        function renderTags() {
            tagsContainer.innerHTML = '';
            const valuesToRender = currentCpaMode === 'percentage' ? cpaValuesPercentage : cpaValuesFixed;
    
            valuesToRender.forEach(value => {
                const tag = document.createElement('div');
                tag.className = 'cpa-tag';
                tag.dataset.value = value; // Armazena valor numérico
                tag.dataset.type = currentCpaMode; // Armazena tipo
    
                const formattedValue = currentCpaMode === 'percentage' ?
                    `${Math.round(value)}%` :
                    formatCurrency(value);
    
                tag.innerHTML = `
            ${formattedValue}
            <button type="button" class="cpa-tag-remove" aria-label="Remover CPA">&times;</button>
          `;
                tagsContainer.appendChild(tag);
            });
            updateHiddenInputs(); // Atualiza hidden inputs após renderizar
        }
    
        // Atualiza os hidden inputs com as listas atuais
        function updateHiddenInputs() {
            hiddenPercentageInput.value = cpaValuesPercentage.join('\n');
            hiddenFixedInput.value = cpaValuesFixed.join('\n');
            hiddenModeInput.value = currentCpaMode;
        }
    
    
        // Carrega dados do CPA do localStorage
        function loadCPADataFromStorage() {
            const savedValues = localStorage.getItem('roiCalculatorValues');
            if (savedValues) {
                const formValues = JSON.parse(savedValues);
                // Carrega o modo, com fallback para 'percentage'
                currentCpaMode = formValues.cpaMode || 'percentage';
                // Carrega as listas, com fallback para arrays vazios se não existirem
                cpaValuesPercentage = (formValues.cpaValuesPercentage || "")
                    .split('\n')
                    .filter(item => item.trim() !== '')
                    .map(item => parseInt(item, 10)) // Percentual é inteiro
                    .sort((a, b) => a - b);
    
                cpaValuesFixed = (formValues.cpaValuesFixed || "")
                    .split('\n')
                    .filter(item => item.trim() !== '')
                    .map(item => parseFloat(item)) // Fixo é float
                    .sort((a, b) => a - b);
    
                updateHiddenInputs(); // Atualiza hidden inputs no load
            } else {
                // Valores padrão se não houver nada salvo
                currentCpaMode = 'percentage';
                cpaValuesPercentage = [30, 40, 50, 60];
                cpaValuesFixed = [];
                updateHiddenInputs();
                saveCPADataToStorage(); // Salva os padrões iniciais
            }
    
        }
    
        // Salva dados do CPA no localStorage
        function saveCPADataToStorage() {
            const formValues = localStorage.getItem('roiCalculatorValues');
            const currentValues = formValues ? JSON.parse(formValues) : {};
    
            currentValues.cpaMode = currentCpaMode;
            currentValues.cpaValuesPercentage = cpaValuesPercentage.join('\n');
            currentValues.cpaValuesFixed = cpaValuesFixed.join('\n');
    
            localStorage.setItem('roiCalculatorValues', JSON.stringify(currentValues));
            updateHiddenInputs(); // Garante que hidden inputs estão sincronizados
        }
    
    } // Fim de setupCPAInput
    
    // Chama a configuração inicial do CPA
    setupCPAInput();
    
    
    // --------- LOCALSTORAGE: SALVAR/CARREGAR VALORES GERAIS DO FORM ----------
    function saveFormValues() {
        const savedData = localStorage.getItem('roiCalculatorValues');
        const currentPersistentData = savedData ? JSON.parse(savedData) : {}; // Preserva dados existentes (CPA, Pós-sell)
    
        const formValues = {
            // Mantém os dados de CPA e Pós-sell salvos
            cpaMode: currentPersistentData.cpaMode || 'percentage',
            cpaValuesPercentage: currentPersistentData.cpaValuesPercentage || '',
            cpaValuesFixed: currentPersistentData.cpaValuesFixed || '',
            numPosSells: numPosSellsSelect.value, // Salva o número de pós-sells selecionado
            posSellsData: posSellsDataInput.value || '[]', // Salva os dados dos pós-sells
            // Adiciona os outros campos do formulário
            gastos: document.getElementById("gastos").value,
            dias: document.getElementById("dias").value,
            ticket: document.getElementById("ticket").value,
            taxas: document.getElementById("taxas").value,
            valorDescontado: document.getElementById("valorDescontado").value,
            // REMOVIDOS: Campos pós-sell fixos
            // posSellPercent: document.getElementById("posSellPercent").value,
            // posSellValor: document.getElementById("posSellValor").value
        };
        localStorage.setItem('roiCalculatorValues', JSON.stringify(formValues));
    }
    
    function loadFormValues() {
        const savedValues = localStorage.getItem('roiCalculatorValues');
        if (savedValues) {
            const formValues = JSON.parse(savedValues);
    
            // Carrega outros campos (precisa formatar corretamente no display)
            const fieldsToLoad = ['gastos', 'dias', 'ticket', 'taxas', 'valorDescontado'];
            fieldsToLoad.forEach(id => {
                const input = document.getElementById(id);
                if (input && formValues[id] !== undefined) {
                    input.value = formValues[id];
                    // Dispara o evento de blur para forçar a formatação correta
                    // Atraso pequeno para garantir que o valor esteja definido antes do blur
                    setTimeout(() => input.dispatchEvent(new Event('blur')), 10);
                }
            });
    
            // Carrega Pós-sells
            const savedNumPosSells = formValues.numPosSells || '0';
            numPosSellsSelect.value = savedNumPosSells;
            let savedPosSellDataArray = [];
            try {
                // Sempre carrega os dados salvos dos pós-sells, mesmo se o número selecionado for 0
                savedPosSellDataArray = JSON.parse(formValues.posSellsData || '[]');
                posSellsDataInput.value = formValues.posSellsData || '[]'; // Garante que o hidden input tenha o valor
            } catch (e) {
                console.error("Erro ao carregar dados de pós-sell:", e);
                savedPosSellDataArray = [];
                posSellsDataInput.value = '[]';
            }
            // Gera os inputs de pós-sell com os dados carregados
            generatePosSellInputs(parseInt(savedNumPosSells, 10), savedPosSellDataArray);
    
    
            // Carrega CPAs (A lógica já está em setupCPAInput)
            // loadCPADataFromStorage(); // Já chamado em setupCPAInput
            // updateCpaInputUI();       // Já chamado em setupCPAInput
            // renderTags();             // Já chamado em setupCPAInput
    
        } else {
            // Se não há nada salvo, define valores padrão e força formatação
            document.getElementById("gastos").value = '0,00';
            document.getElementById("dias").value = '30';
            document.getElementById("ticket").value = '0,00';
            document.getElementById("taxas").value = '0,00';
            document.getElementById("valorDescontado").value = '0,00';
            numPosSellsSelect.value = '0'; // Default 0 pós-sells
            posSellsDataInput.value = '[]'; // Limpa dados de pós-sells
            generatePosSellInputs(0); // Gera 0 campos
            // REMOVIDOS: Padrões dos pós-sells fixos
            // document.getElementById("posSellPercent").value = '0';
            // document.getElementById("posSellValor").value = '0,00';
            document.querySelectorAll('#calcForm input, #calcForm select').forEach(input => {
                setTimeout(() => input.dispatchEvent(new Event('blur')), 10); // Força formatação com delay
            });
    
            // Salva os padrões iniciais (CPA é salvo dentro do setupCPAInput)
            saveFormValues();
        }
    }
    
    // Carrega valores ao iniciar a página
    document.addEventListener('DOMContentLoaded', () => {
        loadFormValues();
    });
    
    
    // --------- HISTÓRICO DE CÁLCULOS (LOCALSTORAGE) ----------
    const MAX_HISTORY_ITEMS = 5;
    
    function loadHistory() {
        const histStr = localStorage.getItem('roiCalcHistory');
        return histStr ? JSON.parse(histStr) : [];
    }
    
    function saveHistory(historyArray) {
        localStorage.setItem('roiCalcHistory', JSON.stringify(historyArray));
    }
    
    function addHistoryEntry(entry) {
        let history = loadHistory();
        history.unshift(entry);
        // Mantemos apenas os X últimos
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }
        saveHistory(history);
        renderHistory();
    }
    
    function renderHistory() {
        const history = loadHistory();
        const container = document.getElementById('calcHistoryContainer');
        container.innerHTML = '';
        if (history.length === 0) {
            container.innerHTML = '<p>Nenhum cálculo recente.</p>';
            return;
        }
        history.forEach((entry, index) => { // Adiciona index se precisar de ID único
            const card = document.createElement('div');
            card.className = 'history-card';
            card.dataset.historyIndex = index; // Para identificar qual carregar
    
            const dateStr = new Date(entry.timestamp).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
    
            // --- Sumário de CPAs ---
            let cpaSummary = 'N/A';
            const mode = entry.formValues.cpaMode || 'percentage'; // Usa o modo salvo
            const cpaValuesString = mode === 'percentage' ? entry.formValues.cpaValuesPercentage : entry.formValues.cpaValuesFixed;
    
            if (cpaValuesString) {
                cpaSummary = cpaValuesString.split('\n')
                    .map(v => mode === 'percentage' ? `${v}%` : formatCurrency(parseFloat(v)))
                    .join(', ');
            }
    
            // --- Sumário de Pós-sells ---
            let posSellSummary = 'Nenhum';
            let posSells = [];
            try {
                posSells = JSON.parse(entry.formValues.posSellsData || '[]');
            } catch (e) {
                posSells = [];
            }
    
            if (posSells.length > 0) {
                posSellSummary = posSells.map((ps, idx) =>
                    `PS${idx + 1}: ${ps.percent}% / ${formatCurrency(ps.valor)}`
                ).join('<br>'); // Quebra de linha para melhor visualização
            }
    
            card.innerHTML = `
            <div class="history-header">
                ${dateStr}
            </div>
            <div class="history-body">
                <div class="history-item">
                <span class="history-label">Gastos</span>
                <span class="history-value">R$ ${entry.formValues.gastos || '0,00'} / ${entry.formValues.dias || '0'} dias</span>
                </div>
                <div class="history-item">
                <span class="history-label">Ticket</span>
                <span class="history-value">R$ ${entry.formValues.ticket || '0,00'}</span>
                </div>
                <div class="history-item">
                <span class="history-label">Taxas</span>
                <span class="history-value">${entry.formValues.taxas || '0,00'}% + R$ ${entry.formValues.valorDescontado || '0,00'}</span>
                </div>
                <div class="history-item">
                  <span class="history-label">CPAs (${mode === 'percentage' ? '%' : 'R$'})</span>
                  <span class="history-value">${cpaSummary}</span>
                </div>
                <div class="history-item full-width">
                  <span class="history-label">Pós-sells (${posSells.length})</span>
                  <span class="history-value" style="text-align: left;">${posSellSummary}</span>
                </div>
            </div>
            `;
            card.addEventListener('click', () => {
                loadCalculationFromHistory(entry);
            });
            container.appendChild(card);
        });
    }
    
    function loadCalculationFromHistory(entry) {
        // Salva os dados do histórico como os valores atuais
        localStorage.setItem('roiCalculatorValues', JSON.stringify(entry.formValues));
        // Recarrega o formulário com esses valores (incluindo CPAs, modo e pós-sells)
        loadFormValues();
        // Simula o submit para recalcular e exibir os resultados
        // Usar um pequeno timeout para garantir que o DOM atualizou após loadFormValues
        setTimeout(() => {
            document.getElementById('calcForm').dispatchEvent(new Event('submit', {
                cancelable: true
            }));
            // Rola a tela para o topo para ver o formulário preenchido
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 150); // Aumentar um pouco o delay para garantir a geração dos campos pós-sell
    }
    
    // Renderiza o histórico ao carregar
    document.addEventListener('DOMContentLoaded', renderHistory);
    
    // --------- CALCULAR (SUBMISSÃO FORM) ----------
    document.getElementById("calcForm").addEventListener("submit", function(e) {
        e.preventDefault();
        saveFormValues(); // Salva os valores atuais do form ANTES de calcular
        const form = this;
        form.classList.add('loading');
    
        // Usa um timeout para permitir que a UI atualize com o 'loading'
        setTimeout(() => {
            try { // Adiciona try...catch para erros de cálculo
                // Pegar valores numéricos puros dos data attributes ou parsear
                const getNumericValue = (id, isCurrency = true, isDataset = true) => {
                    const input = document.getElementById(id);
                    if (!input) return 0;
                    if (isDataset && input.dataset.rawValue !== undefined && input.dataset.rawValue !== '') {
                        return parseFloat(input.dataset.rawValue);
                    }
                    // Fallback: parsear o valor do input
                    let value = input.value;
                    if (isCurrency || id === 'taxas') { // Moeda e % usam vírgula decimal
                        value = value.replace(/\./g, '').replace(',', '.');
                    } else { // Inteiros
                        value = value.replace(/\D/g, '');
                    }
                    return parseFloat(value) || 0;
                };
    
                // Pega valores dos campos fixos
                const gastos = getNumericValue("gastos", true);
                const dias = getNumericValue("dias", false) || 1; // Evitar divisão por zero
                const ticket = getNumericValue("ticket", true);
                const taxasPercent = getNumericValue("taxas", true); // Já vem como número (ex: 5 para 5%)
                const valorDescontadoFixo = getNumericValue("valorDescontado", true);
    
                // Pega dados de CPA do localStorage (mais seguro)
                const savedData = JSON.parse(localStorage.getItem('roiCalculatorValues') || '{}');
                const activeCpaMode = savedData.cpaMode || 'percentage';
                const cpaString = activeCpaMode === 'percentage' ? savedData.cpaValuesPercentage : savedData.cpaValuesFixed;
                let cpaList = (cpaString || "")
                    .split('\n')
                    .filter(item => item.trim() !== '')
                    .map(item => parseFloat(item))
                    .sort((a, b) => a - b);
    
                // NOVA LÓGICA PARA posSells (LEITURA DIRETA DOS INPUTS):
                const numPosSellsAtual = parseInt(document.getElementById('numPosSells').value, 10);
                const posSells = [];
                if (numPosSellsAtual > 0) {
                    for (let i = 1; i <= numPosSellsAtual; i++) {
                        const percentInput = document.getElementById(`posSellPercent_${i}`);
                        const valorInput = document.getElementById(`posSellValor_${i}`);
                        posSells.push({
                            percent: parseInt(percentInput?.dataset.rawValue || '0', 10),
                            valor: parseFloat(valorInput?.dataset.rawValue || '0')
                        });
                    }
                }
                // FIM DA NOVA LÓGICA PARA posSells
    
                // Validação básica
                if (isNaN(gastos) || isNaN(dias) || dias <= 0 || isNaN(ticket) || ticket < 0 || isNaN(taxasPercent) || taxasPercent < 0 || isNaN(valorDescontadoFixo) || valorDescontadoFixo < 0 || cpaList.length === 0) {
                    alert("Por favor, verifique os valores preenchidos (Gastos, Dias, Ticket, Taxas, Valor Fixo). Todos devem ser válidos (Dias > 0, Ticket >= 0). Pelo menos um CPA deve ser adicionado.");
                    form.classList.remove('loading');
                    return;
                }
                // Validação dos pós-sells
                for (let ps of posSells) {
                    if (isNaN(ps.percent) || ps.percent < 0 || ps.percent > 100 || isNaN(ps.valor) || ps.valor < 0) {
                        alert("Por favor, verifique os valores dos Pós-sells. As porcentagens devem ser entre 0 e 100, e os tickets devem ser valores positivos.");
                        form.classList.remove('loading');
                        return;
                    }
                }
    
    
                const totalGastos = gastos * dias;
                let html = "";
    
                // Calcular custo por venda (taxa % + valor fixo R$) para o principal
                const custosPorVendaPrincipal = (ticket * (taxasPercent / 100)) + valorDescontadoFixo;
    
                // --- Card de Resumo ---
                const summaryCpaListFormatted = cpaList.map(cpa =>
                    `<span class="summary-cpa-tag">${activeCpaMode === 'percentage' ? Math.round(cpa) + '%' : formatCurrency(cpa)}</span>`
                ).join('');
    
                // Sumário dos Pós-sells para o card de resumo
                let summaryPosSellsFormatted = 'Nenhum';
                if (posSells.length > 0) {
                    summaryPosSellsFormatted = posSells.map((ps, idx) =>
                        `<span>PS${idx + 1}: ${ps.percent}% / ${formatCurrency(ps.valor)}</span>`
                    ).join('');
                }
    
                // Sumário das taxas de cada Pós-sell para o card de resumo
                let summaryPosSellsTaxasFormatted = 'Nenhum';
                if (posSells.length > 0) {
                    summaryPosSellsTaxasFormatted = posSells.map((ps, idx) => {
                        const custoPorVendaEstePosSell = round((ps.valor * (taxasPercent / 100)) + valorDescontadoFixo, 2);
                        return `<span>PS${idx + 1}: ${formatCurrency(custoPorVendaEstePosSell)}</span>`;
                    }).join('');
                }
    
    
                html += `
            <div class="result-card summary-card">
                <div class="result-header">
                <div class="result-title">Resumo Geral</div>
                </div>
                <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Ticket do Produto</div>
                    <div class="result-value">${formatCurrency(ticket)}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Taxa por Venda Principal</div>
                    <div class="result-value" title="${taxasPercent}% de ${formatCurrency(ticket)} + ${formatCurrency(valorDescontadoFixo)}">
                    ${formatCurrency(custosPorVendaPrincipal)}
                    </div>
                </div>
                <div class="result-item">
                    <div class="result-label">Gastos com Tráfego</div>
                    <div class="result-value" title="${formatCurrency(totalGastos)} total">
                    ${formatCurrency(gastos)} / ${dias} dia${dias > 1 ? 's' : ''}
                    </div>
                </div>
                <div class="result-item">
                    <div class="result-label">CPAs (${activeCpaMode === 'percentage' ? '%' : 'R$'}) Selecionados</div>
                    <div class="result-value cpa-summary">
                    ${summaryCpaListFormatted || 'Nenhum'}
                    </div>
                </div>
                 <div class="result-item">
                     <div class="result-label">Pós-sells (${posSells.length})</div>
                     <div class="result-value pos-sell-summary">
                       ${summaryPosSellsFormatted}
                     </div>
                 </div>
                 <div class="result-item">
                     <div class="result-label">Taxa por Pós-sell</div>
                     <div class="result-value pos-sell-summary">
                       ${summaryPosSellsTaxasFormatted}
                     </div>
                 </div>
                </div>
            </div>
            <div class="results-grid">
            `;
    
                // --- Detalhes para cada CPA ---
                const chartLabels = [];
                const qtdVendasData = []; // Vai incluir pós-sells aqui
                const lucroLiquidoData = [];
                const faturamentoData = [];
    
                cpaList.forEach(cpaValue => {
                    let calculatedCac = 0;
                    let qtdVendasPrincipal = 0;
    
                    // Calcula o Custo de Aquisição (CAC) com base no modo
                    if (activeCpaMode === 'percentage') {
                        if (ticket > 0 && cpaValue > 0) {
                            calculatedCac = round(ticket * (cpaValue / 100), 2);
                        }
                    } else { // Modo 'fixed'
                        calculatedCac = round(cpaValue, 2);
                    }
    
                    // Calcula vendas principais apenas se CAC > 0
                    if (calculatedCac > 0) {
                        qtdVendasPrincipal = Math.floor(totalGastos / calculatedCac);
                    } else {
                        qtdVendasPrincipal = 0;
                    }
    
                    // --- Calcula Pós-Sells ---
                    let qtdVendasPosSellTotal = 0;
                    let faturamentoPosSellTotal = 0;
                    let taxasTotaisPosSell = 0;
    
                    posSells.forEach((ps, index) => {
                        const qtdVendasEstePosSell = Math.floor(qtdVendasPrincipal * (ps.percent / 100));
                        const faturamentoEstePosSell = round(qtdVendasEstePosSell * ps.valor, 2);
                        const custoPorVendaEstePosSell = round((ps.valor * (taxasPercent / 100)) + valorDescontadoFixo, 2);
                        const taxasEstePosSell = round(qtdVendasEstePosSell * custoPorVendaEstePosSell, 2);
    
                        qtdVendasPosSellTotal += qtdVendasEstePosSell;
                        faturamentoPosSellTotal += faturamentoEstePosSell;
                        taxasTotaisPosSell += taxasEstePosSell;
                    });
    
    
                    // Faturamentos
                    const faturamentoPrincipal = round(qtdVendasPrincipal * ticket, 2);
                    // const faturamentoPosSell = round(qtdVendasPosSell * posSellValor, 2); // Substituído
                    const faturamentoTotal = faturamentoPrincipal + faturamentoPosSellTotal;
    
                    // Taxas totais (produto principal + todos pós-sells)
                    const taxasTotaisPrincipal = round(qtdVendasPrincipal * custosPorVendaPrincipal, 2);
                    // const taxasTotaisPosSell = round(qtdVendasPosSell * custosPorVendaPosSell, 2); // Substituído
                    const taxasTotais = taxasTotaisPrincipal + taxasTotaisPosSell;
    
                    // Lucro líquido
                    const lucro = round(faturamentoTotal - taxasTotais - totalGastos, 2);
    
                    // ROI (Retorno sobre Investimento)
                    const roiBrutoX = totalGastos > 0 ? round((faturamentoTotal - taxasTotais) / totalGastos, 2) : 0;
                    const roiLiquidoX = totalGastos > 0 ? round(lucro / totalGastos, 2) : 0;
    
    
                    // Formata o CPA para exibição no card
                    const displayCpaValue = activeCpaMode === 'percentage' ?
                        `${Math.round(cpaValue)}%` :
                        formatCurrency(cpaValue);
    
                    // Adiciona o cálculo da porcentagem do CPA em relação ao ticket quando no modo fixo
                    const cpaPercentOfTicket = ticket > 0 && activeCpaMode === 'fixed' ? 
                        round((cpaValue / ticket) * 100, 1) : 0;
    
                    // --- HTML do Card CPA ---
                    html += `
                    <div class="result-card">
                    <div class="result-header">
                        <div class="result-cpa">${displayCpaValue}</div>
                        <div class="result-cac">
                        <span class="result-cac-label">Custo de Aquisição</span>
                        <span class="result-cac-value">${
                            activeCpaMode === 'percentage' ? 
                            formatCurrency(calculatedCac) : 
                            `${cpaPercentOfTicket}%`
                        }</span>
                        </div>
                    </div>
                    <div class="result-grid">
                        <div class="result-item">
                        <div class="result-label">Qtd. Vendas Principal</div>
                        <div class="result-value sales-details">
                            <div class="sales-total">~ ${formatCompactNumber(qtdVendasPrincipal)}</div>
                            ${qtdVendasPrincipal > 0 ? `
                            <div class="sales-breakdown">
                            <span class="sophisticated">${formatCompactNumber(Math.round(qtdVendasPrincipal / dias))} · dia</span>
                            <span class="sophisticated">${formatCompactNumber(Math.round(qtdVendasPrincipal / dias / 24))} · hora</span>
                            </div>` : ''}
                        </div>
                        </div>
                        <div class="result-item">
                        <div class="result-label">Vendas Pós-sell Total</div>
                        <div class="result-value sales-details">
                             <div class="sales-total">~ ${formatCompactNumber(qtdVendasPosSellTotal)}</div>
                             ${qtdVendasPosSellTotal > 0 ? `
                             <div class="sales-breakdown">
                               <span class="sophisticated">${formatCompactNumber(Math.round(qtdVendasPosSellTotal / dias))} · dia</span>
                               <span class="sophisticated">${formatCompactNumber(Math.round(qtdVendasPosSellTotal / dias / 24))} · hora</span>
                             </div>` : ''}
                        </div>
                        </div>
                        <div class="result-item">
                         <div class="result-label">Faturamento Total</div>
                         <div class="result-value">${formatCurrency(faturamentoTotal)}</div>
                        </div>
                        <div class="result-item">
                         <div class="result-label">Total em Taxas</div>
                         <div class="result-value">${formatCurrency(taxasTotais)}</div>
                        </div>
                        <div class="result-item">
                         <div class="result-label">Lucro Bruto</div>
                         <div class="result-value">
                            ${formatCurrency(faturamentoTotal - taxasTotais)}
                         </div>
                        </div>
                        <div class="result-item">
                        <div class="result-label">ROI BRUTO (x)</div>
                         <div class="result-value">
                            ${formatNumber(roiBrutoX)}x
                         </div>
                        </div>
                        <div class="result-item highlight ${lucro >= 0 ? 'positive' : 'negative'}">
                        <div class="result-label">ROI LÍQUIDO (R$)</div>
                        <div class="result-value highlight ${lucro >= 0 ? 'positive' : 'negative'}">
                            ${formatCurrency(lucro)}
                        </div>
                        </div>
                        <div class="result-item highlight ${lucro >= 0 ? 'positive' : 'negative'}">
                        <div class="result-label">ROI LÍQUIDO (x)</div>
                        <div class="result-value highlight ${lucro >= 0 ? 'positive' : 'negative'}">
                             ${formatNumber(roiLiquidoX)}x
                        </div>
                        </div>
                    </div>
                    </div>
                 `;
    
                    // Adiciona dados para o gráfico
                    chartLabels.push(displayCpaValue); // Usa o valor formatado como label
                    qtdVendasData.push(qtdVendasPrincipal + qtdVendasPosSellTotal); // Total de vendas (principal + pós-sells)
                    lucroLiquidoData.push(lucro);
                    faturamentoData.push(faturamentoTotal);
    
                }); // Fim do forEach cpaList
    
                html += '</div>'; // Fecha results-grid
    
                // Container do Gráfico
                if (cpaList.length > 0) { // Só adiciona gráfico se houver CPAs
                    html += `
                <div class="chart-container">
                    <canvas id="resultsChart"></canvas>
                </div>
                `;
                }
                document.getElementById("result").innerHTML = html;
    
                // --- Montar e Renderizar o Gráfico ---
                if (cpaList.length > 0) {
                    const ctx = document.getElementById('resultsChart').getContext('2d');
                    // Destroi gráfico anterior se existir para evitar sobreposição de tooltips
                    if (window.myRoiChart instanceof Chart) {
                        window.myRoiChart.destroy();
                    }
    
                    window.myRoiChart = new Chart(ctx, { // Armazena na window para poder destruir depois
                        type: 'bar',
                        data: {
                            labels: chartLabels, // Labels já formatados (ex: '50%' ou 'R$ 50,00')
                            datasets: [{
                                    label: 'Qtd. Vendas Total (Princ+PS)', // Label atualizado
                                    data: qtdVendasData,
                                    backgroundColor: 'rgba(108, 117, 125, 0.8)', // Cinza
                                    borderColor: 'rgba(108, 117, 125, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'yVendas', // Eixo Y esquerdo para vendas
                                    order: 3 // Ordem de desenho (atrás)
                                },
                                {
                                    label: 'Faturamento Total',
                                    data: faturamentoData,
                                    backgroundColor: 'rgba(85, 99, 222, 0.8)', // Roxo/Azul primário
                                    borderColor: 'rgba(85, 99, 222, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'yCurrency', // Eixo Y direito para moeda
                                    order: 2
                                },
                                {
                                    label: 'Lucro Líquido',
                                    data: lucroLiquidoData,
                                    backgroundColor: (context) => { // Cor dinâmica: verde para lucro, vermelho para prejuízo
                                        const value = context.raw;
                                        return value >= 0 ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)'; // Verde : Vermelho
                                    },
                                    borderColor: (context) => {
                                        const value = context.raw;
                                        return value >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)';
                                    },
                                    borderWidth: 1,
                                    yAxisID: 'yCurrency', // Eixo Y direito para moeda
                                    order: 1 // Ordem de desenho (frente)
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                mode: 'index', // Mostra tooltips para todas barras no mesmo índice X
                                intersect: false // Tooltip aparece ao passar sobre a coluna, não só na barra exata
                            },
                            scales: {
                                x: {
                                    stacked: false, // Barras lado a lado
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        color: '#838080'
                                    }
                                },
                                yVendas: { // Eixo esquerdo para Quantidade
                                    type: 'linear',
                                    display: true, // Mostrar eixo
                                    position: 'left',
                                    title: {
                                        display: true,
                                        text: 'Qtd. Vendas',
                                        color: '#838080'
                                    },
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.1)'
                                    }, // Linhas de grade claras
                                    ticks: {
                                        color: '#838080',
                                        callback: (value) => formatCompactNumber(value) // Formato compacto (K, M)
                                    }
                                },
                                yCurrency: { // Eixo direito para Moeda
                                    type: 'linear',
                                    display: true, // Mostrar eixo
                                    position: 'right',
                                    title: {
                                        display: true,
                                        text: 'Valor (R$)',
                                        color: '#838080'
                                    },
                                    grid: {
                                        display: false
                                    }, // Sem grade para o eixo direito para não poluir
                                    ticks: {
                                        color: '#838080',
                                        callback: (value) => 'R$ ' + formatCompactNumber(value) // Formato compacto com R$
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'bottom', // Legenda embaixo
                                    labels: {
                                        color: '#838080', // Cor do texto da legenda
                                        usePointStyle: true, // Usa bolinhas ao invés de quadrados
                                        padding: 20
                                    }
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Fundo do tooltip
                                    titleColor: '#838080', // Cor do título (CPA)
                                    bodyColor: '#838080', // Cor do corpo
                                    borderColor: 'var(--primary-color)',
                                    borderWidth: 1,
                                    padding: 10,
                                    usePointStyle: true,
                                    callbacks: {
                                        label: function(context) {
                                            let label = context.dataset.label || '';
                                            if (label) {
                                                label += ': ';
                                            }
                                            const value = context.parsed.y;
                                            if (context.dataset.yAxisID === 'yVendas') {
                                                label += formatNumber(value, 0); // Formata quantidade sem decimais
                                            } else {
                                                label += formatCurrency(value); // Formata como moeda
                                            }
                                            return label;
                                        }
                                    }
                                }
                            }
                        }
                    }); // Fim do new Chart
                } // Fim do if cpaList.length > 0 (gráfico)
    
    
                // --- Salva no Histórico ---
                // Pega os valores *atuais* do formulário que foram salvos ANTES do cálculo
                const currentFormValuesForHistory = JSON.parse(localStorage.getItem('roiCalculatorValues') || '{}');
                addHistoryEntry({
                    timestamp: new Date().toISOString(),
                    formValues: currentFormValuesForHistory // Salva o estado completo usado no cálculo
                });
    
            } catch (error) {
                console.error("Erro durante o cálculo:", error);
                alert("Ocorreu um erro ao calcular o ROI. Verifique os valores e tente novamente.");
                // Limpa a área de resultados em caso de erro grave
                document.getElementById("result").innerHTML = '<p style="color: red; text-align: center;">Erro no cálculo. Verifique o console para detalhes.</p>';
            } finally {
                form.classList.remove('loading'); // Remove o loading, mesmo se der erro
                // Rola para a área de resultados após o cálculo
                document.getElementById('result').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Ajusta tamanho dos textos nos cards de resultado
                setTimeout(adjustResultValues, 100); // Dá um tempo para renderizar antes de ajustar
            }
        }, 50); // Reduzido o timeout para cálculo iniciar mais rápido
    });
    
    // --------- Ajustar TAMANHO DO TEXTO se exceder container ----------
    function adjustResultValues() {
        document.querySelectorAll('.result-value').forEach(element => {
            // Reseta transformações anteriores para recalcular corretamente
            element.style.transform = 'none';
            element.style.transformOrigin = 'left center';
    
            const parent = element.parentElement;
            if (!parent) return;
    
            // Calcula espaço disponível (padding interno do result-item)
            const parentStyle = window.getComputedStyle(parent);
            const parentPaddingLeft = parseFloat(parentStyle.paddingLeft);
            const parentPaddingRight = parseFloat(parentStyle.paddingRight);
            const availableWidth = parent.clientWidth - parentPaddingLeft - parentPaddingRight;
    
            const elementWidth = element.scrollWidth;
    
            if (elementWidth > availableWidth && availableWidth > 0) {
                // Aplica escala com uma pequena margem (95%)
                const scale = Math.min(1, availableWidth / elementWidth * 0.95);
                if (scale < 1) { // Só aplica se a escala for menor que 1
                    element.style.transform = `scaleX(${scale})`;
                }
            }
        });
    }
    // Observer para chamar adjustResultValues quando #result for atualizado
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // Verifica se nós foram adicionados e se o target é #result ou filho
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Usar timeout 0 para colocar a execução no final da fila de eventos,
                // garantindo que o DOM esteja pronto
                setTimeout(adjustResultValues, 0);
                break; // Sai do loop de mutações se já encontrou uma relevante
            }
        }
    });
    // Observa mudanças na subárvore de #result
    const resultContainerElement = document.getElementById('result');
    if (resultContainerElement) {
        observer.observe(resultContainerElement, {
            childList: true,
            subtree: true
        });
    }
    // Ajusta no resize e no load inicial
    window.addEventListener('resize', adjustResultValues);
    document.addEventListener('DOMContentLoaded', () => {
        // Chama após um pequeno delay para garantir renderização inicial
        setTimeout(adjustResultValues, 200);
    });
    
    
    // --------- Menu Hamburger ----------
    document.addEventListener('DOMContentLoaded', function() {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.overlay');
        const mainContent = document.querySelector('main'); // Seleciona o conteúdo principal
    
        function toggleMenu() {
            const isActive = sidebar.classList.contains('active');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            // Adiciona/remove uma classe no main para evitar scroll quando o menu está aberto
            document.body.style.overflow = isActive ? '' : 'hidden';
            if (mainContent) {
                mainContent.style.transition = 'filter 0.3s ease-in-out';
                mainContent.style.filter = isActive ? 'none' : 'blur(3px)'; // Aplica blur no main
                mainContent.style.pointerEvents = isActive ? 'auto' : 'none'; // Desabilita cliques no main
            }
        }
    
        // Fecha o menu se clicar no overlay ou no toggle
        menuToggle.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    
        // Fecha o menu se clicar em um item do histórico (sidebar)
        const historyContainer = document.getElementById('calcHistoryContainer');
        if (historyContainer) {
            historyContainer.addEventListener('click', (e) => {
                if (e.target.closest('.history-card') && sidebar.classList.contains('active')) {
                    toggleMenu(); // Fecha o menu
                }
            });
        }
    });
