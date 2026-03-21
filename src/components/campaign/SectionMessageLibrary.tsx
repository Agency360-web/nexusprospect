import React, { useRef, useState } from 'react';
import { BookOpen, Plus, Trash2, GripVertical, Sparkles, Check, Lightbulb } from 'lucide-react';

export type MessageItem = {
    id: string;
    text: string;
};

export type MessageLibraryType = {
    greeting: MessageItem[];
    presentation: MessageItem[];
    product: MessageItem[];
    triggers: MessageItem[];
    socialProof: MessageItem[];
    cta: MessageItem[];
};

export type DynamicValues = {
    nome?: string;
    empresa?: string;
    cargo?: string;
    produto?: string;
    promessa?: string;
    segmentos?: string;
    nichoBanco?: string;
};

interface Props {
    library: MessageLibraryType;
    setLibrary: React.Dispatch<React.SetStateAction<MessageLibraryType>>;
    dynamicValues?: DynamicValues;
}

const CATEGORIES: { key: keyof MessageLibraryType; title: string; description: string }[] = [
    { key: 'greeting', title: '1. Identificação', description: 'A forma como você se apresenta no primeiro contato.' },
    { key: 'presentation', title: '2. Anúncio', description: 'O que você faz e por que está entrando em contato.' },
    { key: 'product', title: '3. Promessa', description: 'O resultado concreto que você entrega ao cliente.' },
    { key: 'triggers', title: '4. Texto Genérico de Abrangência', description: 'Segmentos e tipos de negócios que você atende.' },
    { key: 'socialProof', title: '5. Frase Específica do Nicho', description: 'Mensagem personalizada para leads com nicho validado.' },
    { key: 'cta', title: '6. Pergunta Final (CTA)', description: 'O próximo passo claro e objetivo.' },
];

const SUGGESTED_TEMPLATES: Record<keyof MessageLibraryType, string[]> = {
    greeting: [
        "Aqui é o {{nome}}, da {{empresa}} :)",
        "{{nome}} aqui, sou da {{empresa}}!",
        "Aqui é o {{nome}} da {{empresa}} ...",
        "Oi, aqui é o {{nome}} — {{empresa}} :)",
        "{{nome}} aqui :) da {{empresa}}",
        "Oi! Aqui é o {{nome}}, da {{empresa}}.",
        "{{nome}} da {{empresa}} por aqui!",
        "Oii, {{nome}} aqui — sou da {{empresa}} :)",
        "Oi! Sou o {{nome}}, da {{empresa}}.",
        "Aqui é o {{nome}}, da {{empresa}} :)",
        "Oi, tudo bem? Aqui é o {{nome}} da {{empresa}}!",
        "{{nome}} aqui, da {{empresa}} — tudo bem?",
        "Olá! {{nome}} aqui, da {{empresa}} :)",
    ],
    presentation: [
        "Desenvolvemos uma metodologia focada em vendas para negócios locais:",
        "Criamos um método que transforma presença digital em resultado financeiro real:",
        "Tenho um formato de trabalho que está ajudando negócios locais a venderem mais:",
        "Estamos aplicando uma estratégia que está gerando resultados concretos para negócios físicos:",
        "Desenvolvemos um modelo de trabalho voltado para aumentar as vendas de negócios locais:",
        "Criamos uma forma de trabalhar que conecta posicionamento digital com crescimento de faturamento:",
        "Tenho uma estratégia que está ajudando empresas locais a atrair mais clientes e vender mais:",
        "Estamos com um método que está transformando o resultado financeiro de negócios físicos:",
        "Desenvolvemos uma abordagem que une estratégia e execução para gerar mais vendas:",
        "Criamos um processo que ajuda negócios locais a se posicionarem melhor e faturarem mais:",
        "Tenho um trabalho que está ajudando empresas físicas a crescerem de forma consistente:",
        "Estamos aplicando uma metodologia que está gerando crescimento real para negócios locais:",
        "Desenvolvemos uma estratégia que está ajudando empresas a atrair o cliente certo e vender mais:",
        "Criamos um método que já está gerando resultados expressivos para negócios como o seu:",
        "Tenho uma forma de trabalhar que foca em resultado financeiro desde o primeiro momento:",
        "Estamos com uma estratégia que está ajudando negócios locais a crescerem de forma previsível:",
        "Quero te apresentar algo que está ajudando negócios físicos a crescerem de forma consistente:",
        "Temos um trabalho que une estratégia digital com resultado real no caixa do negócio:",
        "Desenvolvemos uma solução que está gerando crescimento previsível para negócios locais:",
        "Estou entrando em contato porque temos uma metodologia que está funcionando muito bem para negócios físicos:",
        "Queria compartilhar um trabalho que está transformando o faturamento de empresas locais:",
        "Temos uma abordagem que está ajudando negócios como o seu a atrair mais clientes qualificados:",
        "Criamos um processo que leva negócios locais de uma presença fraca a um posicionamento que vende:",
        "Tenho algo que pode fazer sentido para o momento do seu negócio:",
        "Estamos trabalhando com negócios físicos e os resultados têm sido muito expressivos:",
        "Quero te apresentar uma forma de trabalhar que conecta marketing com crescimento de faturamento:",
        "Desenvolvemos um método que está ajudando negócios locais a saírem da dependência de indicação:",
        "Temos uma estratégia que está gerando clientes novos de forma consistente para negócios físicos:",
        "Criamos um modelo que já ajudou dezenas de negócios locais a crescerem com mais previsibilidade:",
        "Estamos com uma metodologia que transforma o posicionamento digital em vendas reais:",
    ],
    product: [
        "um acompanhamento completo — da estratégia à entrega do conteúdo — para negócios locais que querem crescer e faturar entre *R$ 10 mil e R$ 70 mil/mês*.",
        "um serviço que cuida do seu marketing do início ao fim, ajudando negócios físicos a aumentarem seu faturamento de *R$ 10 mil a R$ 70 mil por mês*.",
        "uma assessoria que analisa seu posicionamento, seus serviços e seu público — e constrói a imagem profissional que vai te ajudar a faturar de *R$ 10k a R$ 70k mensais*.",
        "um trabalho estratégico e prático de marketing para negócios locais alcançarem *R$ 10 mil a R$ 70 mil de faturamento por mês*.",
        "um método que cuida de tudo — do planejamento à execução — para negócios locais que querem chegar a *R$ 10 mil e R$ 70 mil/mês*.",
        "uma estratégia completa de marketing que ajuda negócios físicos a construírem autoridade e faturarem de *R$ 10k a R$ 70k mensais*.",
        "um processo que analisa seu negócio, define o posicionamento certo e atrai os clientes ideais para você faturar entre *R$ 10 mil e R$ 70 mil por mês*.",
        "um trabalho que vai da estratégia à entrega do conteúdo, focado em gerar resultado financeiro real — de *R$ 10 mil a R$ 70 mil/mês*.",
        "uma forma de trabalhar que une planejamento estratégico e produção de conteúdo para negócios locais faturarem de *R$ 10k a R$ 70k mensais*.",
        "um acompanhamento que transforma o posicionamento do seu negócio em vendas reais, com faturamento entre *R$ 10 mil e R$ 70 mil por mês*.",
        "uma metodologia que identifica o que funciona para o seu negócio e executa do início ao fim — gerando de *R$ 10 mil a R$ 70 mil/mês*.",
        "um serviço que cuida da imagem, da estratégia e do conteúdo do seu negócio local para você faturar entre *R$ 10k e R$ 70k mensais*.",
        "um modelo de trabalho focado em atrair o cliente certo e converter em vendas — para negócios físicos que querem faturar de *R$ 10 mil a R$ 70 mil/mês*.",
        "uma assessoria que pega seu negócio do ponto em que está e estrutura tudo para você crescer e faturar entre *R$ 10 mil e R$ 70 mil por mês*.",
        "uma assessoria que estrutura do zero o seu marketing — estratégia, posicionamento e conteúdo — para negócios locais faturarem entre *R$ 10 mil e R$ 70 mil/mês*.",
        "um serviço que cuida de tudo que envolve sua presença digital, com foco em atrair clientes e aumentar o faturamento para *R$ 10k a R$ 70k mensais*.",
        "um trabalho que define como seu negócio deve se posicionar, quem deve atrair e como converter isso em vendas — chegando a *R$ 10 mil a R$ 70 mil/mês*.",
        "uma metodologia completa de marketing para negócios físicos que querem parar de depender de indicação e faturar de *R$ 10 mil a R$ 70 mil por mês*.",
        "um processo que vai do diagnóstico do seu negócio até a entrega do conteúdo pronto — projetado para gerar de *R$ 10k a R$ 70k mensais*.",
        "uma assessoria que transforma a identidade do seu negócio em um ativo que atrai clientes e gera *R$ 10 mil a R$ 70 mil/mês* de forma consistente.",
        "um acompanhamento que entrega estratégia e execução juntos — sem você precisar se preocupar com marketing — gerando de *R$ 10k a R$ 70k mensais*.",
        "um modelo de assessoria que analisa seu mercado, define seu diferencial e produz conteúdo focado em vendas para você faturar de *R$ 10 mil a R$ 70 mil/mês*.",
        "uma forma de trabalhar que cuida da imagem, do discurso e da presença digital do seu negócio para atrair o cliente certo e faturar *R$ 10k a R$ 70k mensais*.",
        "um trabalho que pega tudo que está no seu negócio e transforma em posicionamento estratégico para você faturar entre *R$ 10 mil e R$ 70 mil por mês*.",
        "uma assessoria que entende o seu mercado e constrói uma presença digital que converte — pensada para negócios que querem chegar a *R$ 10k a R$ 70k mensais*.",
        "um processo de marketing que começa pelo seu negócio, não pelo algoritmo — e que está gerando de *R$ 10 mil a R$ 70 mil/mês* para negócios locais.",
    ],
    triggers: [
        "Serve para Lojas, Clínicas, Fábricas, Franquias, Delivery, Distribuidoras e mais de 200 tipos de negócio!",
        "Ideal para Comércios, Consultórios, Indústrias, Franquias, Restaurantes e +220 negócios locais!",
        "Ideal para setores de MatCon, Automotivo, Alimentação, Lojas, Franquias e +200 negócios físicos.",
        "Funciona para Delivery, Prestadoras de Serviços, Pequenas Fábricas, Franquias, Lojas e +200 tipos.",
        "Válido para Saúde e Estética, Lojas de Varejo, Franquias, Pequenas Indústrias e +200 ramos.",
        "Serve para Negócios Comissionados, Construção, Alimentação, Lojas, Franquias e +200 segmentos.",
        "Perfeito para Pequenas Indústrias, Oficinas, Franquias, Lojas, Serviços e +200 negócios.",
        "Atende o ramo Automotivo, Delivery, Prestadoras de Serviços, Franquias, Lojas e +200 tipos.",
        "Funciona para Alimentação, MatCon, Negócios Comissionados, Lojas, Franquias e +200 ramos.",
        "Ideal para Cafeterias, Automotivo, Pequenas Indústrias, Lojas, Serviços, Franquias e +200 negócios.",
        "Funciona para Prestadoras de Serviços, Automotivo, Lojas, Franquias, Área de Saúde e +200 negócios.",
        "Funciona para Serviços, Comissionados, Lojas, Franquias, Alimentação e +200 tipos de negócio.",
        "Funciona para Barbearias, Clínicas, Lojas de Varejo, Franquias, Alimentação e +200 ramos!",
        "Ideal para Imobiliárias, Pet Shops, Academias, Lojas, Franquias e +200 negócios locais!",
        "Perfeito para Escritórios, Consultórios, Oficinas, Lojas, Delivery e +200 segmentos físicos.",
        "Serve para o ramo da Construção, Estética, Educação, Lojas, Franquias e +200 tipos de negócio.",
        "Atende Serviços Especializados, Prestadoras, Automotivo, Lojas, Franquias e +200 negócios.",
        "Funciona para Clínicas Odontológicas, Pet Shops, Marcenarias, Lojas, Franquias e +200 ramos.",
        "Ideal para quem trabalha com Eventos, Alimentação, Saúde, Lojas, Franquias e +200 segmentos.",
        "Válido para Academias, Distribuidoras, Franquias, Serviços Automotivos, Lojas e +200 negócios.",
        "Perfeito para Estúdios, Clínicas, Gráficas, Franquias, Comércios locais e +200 tipos de negócio.",
        "Serve para Padarias, Imobiliárias, Prestadoras de Serviços, Lojas, Franquias e +200 ramos.",
        "Funciona para Buffets, Clínicas de Estética, Franquias, Lojas, Pequenas Indústrias e +200 tipos.",
    ],
    socialProof: [
        "Inclusive, vi que você atua com *{{nichoBanco}}* — esse é exatamente o perfil que atendemos.",
        "Como você trabalha com *{{nichoBanco}}*, nossa assessoria pode te ajudar a se posicionar e atrair mais clientes nesse segmento.",
        "Para quem atua com *{{nichoBanco}}*, nosso trabalho faz toda a diferença no posicionamento e na atração de clientes.",
        "Vi que seu negócio é na área de *{{nichoBanco}}* — temos experiência com esse segmento e o resultado costuma ser muito bom.",
        "Negócios de *{{nichoBanco}}* têm muito espaço para crescer com uma boa estratégia de marketing — e é exatamente isso que fazemos.",
        "Para o segmento de *{{nichoBanco}}*, nossa assessoria cuida de tudo: estratégia, posicionamento e entrega de conteúdo.",
        "Seu segmento, *{{nichoBanco}}*, tem muito potencial — e nosso trabalho é justamente ajudar você a explorar isso com marketing profissional.",
    ],
    cta: [
        "*Faz sentido para você agora?*",
        "*Posso te enviar os detalhes por aqui?*",
        "*Quer receber mais informações?*",
        "*Te ajudaria conhecer melhor o nosso trabalho?*",
        "*Faz sentido para o seu momento atual?*",
        "*Acha válido a gente conversar sobre isso?*",
        "*Teria interesse em saber mais?*",
        "*Seria útil para você conhecer nossa assessoria?*",
        "*Faz sentido eu te mostrar como funciona?*",
        "*Posso te passar mais detalhes sobre como trabalhamos?*",
        "*Posso te mostrar como isso funcionaria para o seu negócio?*",
        "*Faria sentido a gente trocar uma ideia rápida sobre isso?*",
        "*Você toparia saber como aplicamos isso para negócios como o seu?*",
        "*Quer entender melhor como funciona na prática?*",
        "*Consigo te explicar tudo em poucos minutos — topa?*",
        "*Você gostaria de saber se faz sentido para o seu negócio?*",
        "*Posso te mandar um resumo de como trabalhamos?*",
        "*Seria interessante entender como isso se aplica ao seu segmento?*",
        "*Você toparia ver um exemplo do que fazemos?*",
        "*Faz sentido a gente conversar sobre o seu negócio?*",
    ],
};

// Substitui variáveis dinâmicas nos templates para exibição ao usuário
const renderTemplate = (template: string, values: DynamicValues): string => {
    return template
        .replace(/\{\{nome\}\}/g, values.nome || '[Nome]')
        .replace(/\{\{empresa\}\}/g, values.empresa || '[Empresa]')
        .replace(/\{\{cargo\}\}/g, values.cargo || '[Cargo]')
        .replace(/\{\{produto\}\}/g, values.produto || '[Produto/Serviço]')
        .replace(/\{\{promessa\}\}/g, values.promessa || '[Promessa]')
        .replace(/\{\{segmentos\}\}/g, values.segmentos || '[Segmentos]')
        .replace(/\{\{nichoBanco\}\}/g, values.nichoBanco || '[Nicho]');
};

const SectionMessageLibrary: React.FC<Props> = ({ library, setLibrary, dynamicValues = {} }) => {
    const [showSuggestions, setShowSuggestions] = useState<keyof MessageLibraryType | null>(null);
    const dragItem = useRef<{ category: keyof MessageLibraryType, index: number } | null>(null);
    const dragOverItem = useRef<{ category: keyof MessageLibraryType, index: number } | null>(null);

    const handleAdd = (category: keyof MessageLibraryType, text: string = '') => {
        setLibrary(prev => ({
            ...prev,
            [category]: [...prev[category], { id: (Date.now() + Math.random()).toString(), text }]
        }));
    };

    const handleAddAll = (category: keyof MessageLibraryType) => {
        const existingTexts = new Set(library[category].map(item => item.text));
        const newItems = SUGGESTED_TEMPLATES[category]
            .filter(template => !existingTexts.has(template))
            .map(template => ({ id: (Date.now() + Math.random()).toString(), text: template }));
        if (newItems.length === 0) return;
        setLibrary(prev => ({
            ...prev,
            [category]: [...prev[category], ...newItems]
        }));
    };

    const handleUpdate = (category: keyof MessageLibraryType, id: string, text: string) => {
        setLibrary(prev => ({
            ...prev,
            [category]: prev[category].map(item => item.id === id ? { ...item, text } : item)
        }));
    };

    const handleRemove = (category: keyof MessageLibraryType, id: string) => {
        setLibrary(prev => ({
            ...prev,
            [category]: prev[category].filter(item => item.id !== id)
        }));
    };

    const handleSort = (category: keyof MessageLibraryType) => {
        if (!dragItem.current || !dragOverItem.current) return;
        
        if (dragItem.current.category !== category || dragOverItem.current.category !== category) return;

        setLibrary(prev => {
            const list = [...prev[category]];
            const draggedContent = list[dragItem.current!.index];
            list.splice(dragItem.current!.index, 1);
            list.splice(dragOverItem.current!.index, 0, draggedContent);
            return {
                ...prev,
                [category]: list
            };
        });

        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <section id="sec-5" className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="mb-4">
                <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-1">
                    <BookOpen className="text-slate-700" size={18} />
                    5. Biblioteca de Mensagens (Variações)
                </h4>
                <p className="text-slate-500 text-sm">O N8N fará o spintax misturando um bloco de cada categoria. Use as <strong>Sugestões</strong> para adicionar modelos prontos.</p>
            </div>

            <div className="space-y-4">
                {CATEGORIES.map(({ key, title, description }) => (
                    <div key={key} className="border border-slate-200 rounded-md overflow-hidden bg-white">
                        <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                            <div>
                                <h5 className="font-bold text-sm text-slate-700">{title}</h5>
                                <p className="text-[10px] text-slate-400 font-medium">{description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowSuggestions(showSuggestions === key ? null : key)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                        showSuggestions === key 
                                        ? 'bg-indigo-600 text-white shadow-sm' 
                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'
                                    }`}
                                >
                                    <Lightbulb size={12} /> Sugestões
                                </button>
                                <span className="text-xs font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">{library[key].length} variações</span>
                            </div>
                        </div>

                        {showSuggestions === key && (
                            <div className="bg-indigo-50/30 border-b border-indigo-100 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="text-indigo-500" size={14} />
                                        <span className="text-xs font-bold text-indigo-700">Modelos Recomendados</span>
                                        <span className="text-[10px] text-indigo-400 ml-1">Clique para adicionar</span>
                                    </div>
                                    {(() => {
                                        const existingTexts = new Set(library[key].map(item => item.text));
                                        const remaining = SUGGESTED_TEMPLATES[key].filter(t => !existingTexts.has(t)).length;
                                        return remaining > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => handleAddAll(key)}
                                                className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
                                            >
                                                <Plus size={10} /> Adicionar Todas ({remaining})
                                            </button>
                                        ) : (
                                            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-600">
                                                <Check size={10} /> Todas adicionadas
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                                    {SUGGESTED_TEMPLATES[key].map((template, i) => {
                                        const isAlreadyIn = library[key].some(item => item.text === template);
                                        const displayText = renderTemplate(template, dynamicValues);
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                disabled={isAlreadyIn}
                                                onClick={() => handleAdd(key, template)}
                                                className={`text-[10px] font-medium px-3 py-1.5 rounded-md border transition-all text-left max-w-sm ${
                                                    isAlreadyIn 
                                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                    : 'bg-white border-indigo-100 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-sm'
                                                }`}
                                            >
                                                {displayText}
                                                {isAlreadyIn && <Check size={10} className="inline ml-1 text-green-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        <div className="p-3 space-y-2">
                            {library[key].length === 0 ? (
                                <div className="text-center py-3 bg-slate-50 rounded-md border border-dashed border-slate-200">
                                    <p className="text-xs text-slate-400 font-medium">Nenhuma variação adicionada.</p>
                                </div>
                            ) : (
                                library[key].map((item, index) => (
                                    <div 
                                        key={item.id} 
                                        className="flex items-start gap-2 group"
                                        draggable
                                        onDragStart={(e) => {
                                            dragItem.current = { category: key, index };
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.currentTarget.classList.add('opacity-50');
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.classList.remove('opacity-50');
                                        }}
                                        onDragEnter={() => {
                                            dragOverItem.current = { category: key, index };
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleSort(key)}
                                    >
                                        <div className="mt-2.5 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 transition-colors">
                                            <GripVertical size={14} />
                                        </div>
                                        <textarea 
                                            value={item.text}
                                            onChange={(e) => handleUpdate(key, item.id, e.target.value)}
                                            placeholder={`Escreva a variação ${index + 1}...`}
                                            className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-xs font-medium resize-none h-16"
                                        ></textarea>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemove(key, item.id)}
                                            className="mt-1.5 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                            title="Remover Variação"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}

                            <button 
                                type="button" 
                                onClick={() => handleAdd(key)}
                                className="w-full mt-2 border border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-600 hover:bg-slate-50 font-bold py-2 rounded-md flex items-center justify-center gap-1.5 transition-all text-xs"
                            >
                                <Plus size={14} />
                                Adicionar variação
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SectionMessageLibrary;
