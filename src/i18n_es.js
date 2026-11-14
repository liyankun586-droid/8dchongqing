/* 渝你有约 — V1 翻译包：西班牙语
 *
 * 原则：
 * 1. 一条文案只用西班牙语，不与英文混排。
 * 2. 术语统一：棒棒=el cargador（el que carga bultos）/ 朝天门=Chaotianmen
 *    梯坎=los escalones / 火锅=la olla caliente（hot pot）
 * 3. 没翻译的条目自动回退到英文（见 i18n.js 的 FALLBACK）。
 */
(function (root) {
  'use strict';

  root.CQI18N_PACK_ES = root.CQI18N_PACK_ES || {};

  root.CQI18N_PACK_ES = {
    /* ── 结语：棒棒 ── */
    'job:bangbang:0': {
      title: 'El último maestro',
      body: 'Tu aprendiz ya carga sus propias cargas. No ahorraste dinero, pero le enseñaste a dos personas a mantenerse de pie en una pendiente.'
    },
    'job:bangbang:1': {
      title: 'La última carga',
      body: 'Cargaste desde los veinte hasta los sesenta. Ya no queda nadie en el oficio, pero todavía conoces cada pendiente de Chaotianmen.'
    },
    'job:bangbang:2': {
      title: 'Otro oficio',
      body: 'Te volviste camionero. La fuerza sigue ahí; solo cambió el precio.'
    },
    'job:bangbang:3': {
      title: 'El bastón de bambú',
      body: 'Un bastón de bambú y dos pañuelos. La ciudad convirtió sus pendientes en ascensores, pero tus hombros seguían igual.'
    },

    /* ── 结语：白领 ── */
    'job:office:0': {
      title: 'Dos vidas',
      body: 'Llegaste a mando medio en una torre en Jiangbei. El recibo de sueldo es respetable. En tres años no saliste del edificio antes de las ocho.'
    },
    'job:office:1': {
      title: 'Una montaña en la oficina',
      body: 'Veinte años en la planta dieciocho. Esta torre es más alta que casi todas las montañas. Tu escritorio está sobre la cumbre, pero nadie mira por la ventana.'
    },
    'job:office:2': {
      title: 'Dos paradas de más',
      body: 'Vives a cinco kilómetros y gastas una hora extra al día en un piso más barato. Hiciste la cuenta durante treinta años. Aun así salía a favor.'
    },
    'job:office:3': {
      title: 'El cubículo',
      body: 'Treinta años en una sala con aire acondicionado. Ni el verano ni el invierno de Chongqing pasaron por esa ventana.'
    },

    /* ── 结语：教师 ── */
    'job:teacher:0': {
      title: 'La última fila',
      body: 'Uno de tus alumnos todavía te escribe cada año nuevo. No hiciste nada grande, pero alguien te recuerda.'
    },
    'job:teacher:1': {
      title: 'Polvo de tiza',
      body: 'Terminaste un libro de historia entero en ese aula. La ciudad cambió tres veces las torres y el campo se volvió una cancha. Tu horario nunca cambió.'
    },
    'job:teacher:2': {
      title: 'La campana',
      body: 'Tocaste la última campana durante treinta años. Los alumnos siempre salían antes que tú.'
    },

    /* ── 结语：护士 ── */
    'job:nurse:0': {
      title: 'Turno de noche',
      body: 'Veinte años de noches. Tu cuerpo aguantó la enfermedad de otros más que la propia.'
    },
    'job:nurse:1': {
      title: 'Alguien se acuerda',
      body: 'Un paciente te puso en la mano una bolsa de huevos cocidos en casa el día del alta. No los aceptaste.'
    },
    'job:nurse:2': {
      title: 'La luz del pasillo',
      body: 'Caminaste incontables amaneceres bajo las luces del pasillo. Esta ciudad tiene las pendientes más empinadas del mundo, pero nadie sube corriendo a las tres de la mañana.'
    },

    /* ── 结语：工厂 ── */
    'job:factory:0': {
      title: 'Las manos',
      body: 'Tus manos envejecieron antes que tu cara. La planta instaló líneas automáticas nuevas y te dejó porque sabes arreglar las máquinas viejas.'
    },
    'job:factory:1': {
      title: 'Una casa junto a la fábrica',
      body: 'Viviste toda tu vida en una casa propia junto a la planta. El balcón tenía ropa tendida y también daba a los cargueros nocturnos del Jialing.'
    },
    'job:factory:2': {
      title: 'Dos turnos',
      body: 'Treinta años de dos turnos. Lo más difícil no era el cansancio: era salir del turno de día directo al sol de camino a la pendiente de tu casa.'
    },

    /* ── 结语：司机 ── */
    'job:driver:0': {
      title: 'El camión se pagó solo',
      body: 'Doce años manejando pagaron el camión. Ahora es tu camión, y sigue siendo la misma autopista.'
    },
    'job:driver:1': {
      title: 'El volante',
      body: 'El volante se gastó hasta brillar bajo tus manos. En Chongqing no hay un tramo recto, ni el que baja la montaña.'
    },

    /* ── 结语：农民 ── */
    'job:farmer:0': {
      title: 'Maduro',
      body: 'Volviste a la montaña y labraste. La tierra, la casa y la gente estaban todas en la ladera.'
    },
    'job:farmer:1': {
      title: 'Olor a arrozal',
      body: 'Despertabas con el ruido del agua. El barro se te pegaba en los pies y recordabas ese olor.'
    },

    /* ── 结语：程序员 ── */
    'job:tech:0': {
      title: 'Código de por vida',
      body: 'Escribiste código y sostuviste el mundo con él. Alguien lo usó, alguien ganó dinero con él. También era tuyo.'
    },
    'job:tech:1': {
      title: 'Las mismas pantallas',
      body: 'Cientos de miles de horas delante de la misma pantalla. No hace falta saber quién estaba al otro lado.'
    },

    /* ── 结语：小生意 ── */
    'job:shop:0': {
      title: 'Un año afortunado',
      body: 'Un año afortunado te dejó libre. Apostaste todo. Todo volvió. Juraste no hacerlo nunca más.'
    },
    'job:shop:1': {
      title: 'El letrero',
      body: 'Tu letrero era pequeño. La gente pasaba, se detenía, y volvía a pasar.'
    },

    /* ── 结语：手艺人 ── */
    'job:shop:2': {
      title: 'Cerrando el puesto',
      body: 'Cerrabas el puesto cada medianoche. El mercado nocturno de aquí no se vacía hasta las dos, así que nadie conocía mejor que tú cuándo se callaba la calle.'
    },
    'job:craft:0': {
      title: 'La mano heredada',
      body: 'Tu mano venía de los viejos maestros. Las herramientas cambiaron tres veces. La mano no cambió ni una.'
    },
    'job:craft:1': {
      title: 'Tu propio precio',
      body: 'Tu mano tenía tu propio precio. Nadie en el mundo lo sabía mejor que tú.'
    },

    /* ── 结语：工地 ── */
    'job:construction:0': {
      title: 'Las rodillas',
      body: 'El dinero llegaba rápido; las rodillas se acababan primero. Todas las leyendas de la construcción pasan por una escalera.'
    },
    'job:construction:1': {
      title: 'El casco',
      body: 'Casco puesto, a las seis de la mañana a la obra. La estructura de encima siempre se detenía por encima de tu cabeza.'
    },

    /* ── 结语：快递 ── */
    'job:courier:0': {
      title: 'El último hombro',
      body: 'Los cargadores desaparecieron, pero los hombros quedaron. Ahora mueves paquetes. Es más rápido, pero caminas menos.'
    },

    /* ── 通用结语 ── */
    'generic:0': {
      title: 'Un rico desconocido',
      body: 'Hiciste el dinero. Pero esta ciudad es enorme, y solo conociste a unos cuantos.'
    },
    'generic:1': {
      title: 'Toda la calle te conoce',
      body: 'En la calle donde viviste décadas, sabes los asuntos de todos. Esa es tu fortuna.'
    },
    'generic:2': {
      title: 'No está mal',
      body: 'Nunca te hiciste rico. Nunca odiaste la ciudad.'
    },
    'generic:3': {
      title: 'Criado por ti mismo',
      body: 'A los cinco te quedaste en el pueblo. Diez años después viniste solo a la ciudad a buscar a tus padres. Nadie vino contigo.'
    },
    'generic:4': {
      title: 'Bajando la pendiente',
      body: 'A los setenta vendiste el piso y volviste al condado. El piso ya no está. Pero todavía conoces cada nogal de aquí.'
    },
    'generic:5': {
      title: 'No miró atrás',
      body: 'Tu hijo se fue a la costa y no te dejó despedirlo. Lo entiendes. Aún te preguntas si lo pensó cuando el coche arrancó.'
    },
    'generic:6': {
      title: 'Una vida entera',
      body: 'Viviste una vida completa en Chongqing. Sin leyenda, y la ciudad tampoco te devoró.'
    },

    /* ── 楼层回声 ── */
    'floor:L0:0': {
      body: 'Viviste en el piso {floor}. La calle era otro mundo. Entre tu puerta y la acera había más escalones. Dos veces al día durante cuarenta años. Las rodillas lo anotaron todo.'
    },
    'floor:L0:1': {
      body: 'Viviste en el piso {floor}. La humedad subía desde el zócalo y en invierno tenías que quemar carbón. Pero la calle estaba ahí, y a nadie le importaba a qué hora llegabas.'
    },
    'floor:L1:0': {
      body: 'Viviste en una casa sobre pilotes. Debajo había agua. Cuando subía de noche, sabías cuántos escalones le separaban de tu cama. Para ver el río desde tu puerta tenías que pasar entre los cimientos de tu propia casa.'
    },
    'floor:L1:1': {
      body: 'Viviste en el piso {floor}, junto al río. Cuando pasaban los cargueros de noche, toda la calle temblaba. Después de un año dejaste de oírlo, y luego lo echaste de menos.'
    },
    'floor:L2:0': {
      body: 'Viviste bajo el puente, en el piso {floor}. El tráfico pasaba encima y el suelo temblaba de vez en cuando. Aprendiste a distinguir un camión ligero de uno cargado. Cuando no podías dormir, contabas.'
    },
    'floor:L3:0': {
      body: 'Viviste en la planta baja, con la calle en tu puerta. Conocías cada negocio de abajo y a qué hora apagaban las luces. Rara vez estabas solo, y nunca te sentiste solo.'
    },
    'floor:L3:1': {
      body: 'Viviste en el piso {floor}, sobre las tiendas. Los letreros ardían hasta las dos de la mañana y dormías dentro de su luz. Todo estaba a mano; nunca supiste si afuera era de día.'
    },
    'floor:L4:0': {
      body: 'Viviste en el piso {floor} de un edificio sin ascensor. El piso era llano; la calle estaba más arriba. Volver era bajar, salir era subir. Algunas personas nunca subieron su propia escalera, porque los escalones estaban debajo de ellas.'
    },
    'floor:L4:1': {
      body: 'Viviste en el piso {floor}. {stairs} escalones al día, dentro de tu propio edificio. No eran empinados. Solo nunca paraban.'
    },
    'floor:L4:2': {
      body: 'Viviste en el piso {floor}. La luz del rellano llevaba tres años rota y subiste a oscuras más que nadie.'
    },
    'floor:L5:0': {
      body: 'Viviste en el piso {floor}, con ascensor. Eran pocos los escalones. Después, cada otro dolor se hizo presente. El día que se rompió el ascensor, descubriste que hacía años que no subías tus propios escalones.'
    },
    'floor:L5:1': {
      body: 'Viviste en el piso {floor}, con ascensor. La vida más corriente de esta ciudad: ni tan bajo ni tan alto como para ver el río, o oírlo. Cada puerta que cruzabas tenía un ascensor esperando.'
    },
    'floor:L5:2': {
      body: 'Viviste en el piso {floor}. El rellano siempre olía a que alguien estaba cocinando. Comiste treinta años la comida de los demás por el olfato.'
    },
    'floor:L6:0': {
      body: 'Viviste en el piso {floor}, arriba. La ventana daba al río; los barcos de paseo pasaban por debajo. Una vez un invitado se quedó mirando el cristal un buen rato y dijo que el piso valía una fortuna. Dijiste sí, y fuiste a lavar los platos.'
    },
    'floor:L6:1': {
      body: 'Viviste en el piso {floor}. Aquí arriba hacía más viento y el sol pegaba más fuerte. No había nadie en la planta; no coincidías con ningún vecino en el ascensor. Aprendiste a asentir en el ascensor y no decir nada más.'
    },
    'floor:L7:0': {
      body: 'Viviste en el ático, en el piso {floor}. Todas las luces de la ciudad estaban debajo. El viento venía del río: calor en verano, frío en invierno. Eras el único hogar en la planta, y el rellano nunca sonaba — salvo cuando volvías a casa.'
    }

  /* ---------- 界面零散文案 ---------- */
  };

  /* ---------- 楼型名（原型） ---------- */
  root.CQI18N_PACK_ES['home:Converted bunker room'] = { body: 'Cuarto de sótano reconvertido' };
  root.CQI18N_PACK_ES['home:Riverside stilt house'] = { body: 'Casa sobre pilotes a orillas del río' };
  root.CQI18N_PACK_ES['home:Under-the-bridge flat'] = { body: 'Piso bajo el puente' };
  root.CQI18N_PACK_ES['home:Shop below, home above'] = { body: 'Local abajo, vivienda arriba' };
  root.CQI18N_PACK_ES['home:Stair-terrace block'] = { body: 'Bloque de terrazas con escaleras' };
  root.CQI18N_PACK_ES['home:Millennium block'] = { body: 'Bloque del milenio' };
  root.CQI18N_PACK_ES['home:River-view tower'] = { body: 'Torre con vista al río' };
  root.CQI18N_PACK_ES['home:Top-floor penthouse'] = { body: 'Ático de la última planta' };
  root.CQI18N_PACK_ES['home:High-rise walk-up'] = { body: 'Bloque alto sin ascensor' };

  /* ---------- 楼型名 ---------- */
  root.CQI18N_PACK_ES['home:Stilt house'] = { body: 'Casa sobre pilotes' };
  root.CQI18N_PACK_ES['home:Soviet-style block'] = { body: 'Bloque soviético' };
  root.CQI18N_PACK_ES['home:Old residential block'] = { body: 'Bloque residencial antiguo' };
  root.CQI18N_PACK_ES['home:Resettlement block'] = { body: 'Bloque de reasentamiento' };
  root.CQI18N_PACK_ES['home:New tower block'] = { body: 'Bloque de torres nuevo' };
  root.CQI18N_PACK_ES['home:Self-built house'] = { body: 'Casa autoconstruida' };

  /* ---------- 垂直层 SEO 描述 ---------- */
  root.CQI18N_PACK_ES['seo:layer:L0'] = { body: 'Sótano. La humedad sube desde el zócalo y la calle está a decenas de metros de altura. Volver a casa es una escalera que no acaba.' };
  root.CQI18N_PACK_ES['seo:layer:L1'] = { body: 'Ribera. Casas sobre pilotes en el agua; el planta baja se inunda primero. De noche pasan las bargas y toda la calle tiembla.' };
  root.CQI18N_PACK_ES['seo:layer:L2'] = { body: 'Bajo el puente. El tráfico pasa por encima y el suelo tiembla de vez en cuando. Alquiler barato; no puedes dormir.' };
  root.CQI18N_PACK_ES['seo:layer:L3'] = { body: 'A pie de calle. Los rótulos arden hasta las dos de la mañana. El sitio más cómodo y el más ruidoso.' };
  root.CQI18N_PACK_ES['seo:layer:L4'] = { body: 'Nivel de escaleras. Donde Chongqing empieza a subir. Incluso los del primer piso suben decenas o cientos de escalones para llegar a la calle.' };
  root.CQI18N_PACK_ES['seo:layer:L5'] = { body: 'Piso residencial estándar, donde ocurre casi toda una vida. Ni tan bajo ni tan alto como para ver o oír el río.' };
  root.CQI18N_PACK_ES['seo:layer:L6'] = { body: 'Torre. Los barcos de paseo pasan bajo la ventana. Más viento que a nivel de calle y ningún vecino en el ascensor.' };
  root.CQI18N_PACK_ES['seo:layer:L7'] = { body: 'Ático. Todas las luces de la ciudad debajo. Una sola vivienda en la planta y una escalera que nunca ha sonado.' };

  /* ---------- 落地页钩子（长文案） ---------- */
  root.CQI18N_PACK_ES['ui:重庆是世界上唯一的 8D 城市：一栋楼能同时是地铁站、商场、菜市场和江景房。'] = { body: 'Chongqing es la única ciudad 8D del planeta: un mismo edificio puede ser estación de metro, centro comercial, mercado y piso con vista al río.' };
  root.CQI18N_PACK_ES['ui:你不能选自己的出生地。但你可以选住几楼——而这一层会改写你的一生。'] = { body: 'No eliges dónde naces. Sí eliges en qué piso vives — y ese piso reescribe tu vida entera.' };
  root.CQI18N_PACK_ES['ui:点击投胎。系统按重庆 37 个区县的真实出生数据抽取，不能选择。'] = { body: 'Haz clic para nacer. Se sortea con los datos reales de natalidad de los 37 distritos de Chongqing. No se puede elegir.' };
  root.CQI18N_PACK_ES['ui:按 37 个区县的出生人口权重抽取。'] = { body: 'Se sortea ponderado por la natalidad real de 37 distritos.' };
  root.CQI18N_PACK_ES['ui:出生到死亡，不重掷、不复活。'] = { body: 'Del nacimiento a la muerte. Sin volver a tirar, sin resurrecciones.' };
  root.CQI18N_PACK_ES['ui:整个游戏免费，付费只买纪念品。'] = { body: 'El juego es gratis. Pagar solo compra recuerdos.' };
  root.CQI18N_PACK_ES['ui:楼层同时改写通勤、体力、租金、健康和关系。'] = { body: 'El piso cambia a la vez trayecto, energía, alquiler, salud y vínculos.' };
  root.CQI18N_PACK_ES['ui:一生里有几个节点要你自己拿主意。'] = { body: 'Unas pocas veces en la vida te tocará decidir.' };

  /* ---------- 界面零散文案（t('中文','English') 专用） ---------- */
  root.CQI18N_PACK_ES['ui:投胎'] = { body: 'Nacer' };
  root.CQI18N_PACK_ES['ui:住几楼？'] = { body: '¿En qué piso?' };
  root.CQI18N_PACK_ES['ui:不可选出生地'] = { body: 'El lugar de nacimiento no se elige' };
  root.CQI18N_PACK_ES['ui:一生只有一次'] = { body: 'Una sola vida' };
  root.CQI18N_PACK_ES['ui:付费不改命'] = { body: 'Pagar no cambia el destino' };
  root.CQI18N_PACK_ES['ui:住几楼是核心'] = { body: 'El piso es el juego' };
  root.CQI18N_PACK_ES['ui:你还会遇到抉择'] = { body: 'También te toca decidir' };
  root.CQI18N_PACK_ES['ui:视野'] = { body: 'Vista' };
  root.CQI18N_PACK_ES['ui:街坊多'] = { body: 'Muchos vecinos' };
  root.CQI18N_PACK_ES['ui:没人串门'] = { body: 'Nadie visita' };
  root.CQI18N_PACK_ES['ui:潮湿'] = { body: 'Húmedo' };
  root.CQI18N_PACK_ES['ui:车流吵'] = { body: 'Ruido de tráfico' };
  root.CQI18N_PACK_ES['ui:看得见江'] = { body: 'Se ve el río' };
  root.CQI18N_PACK_ES['ui:一般'] = { body: 'Normal' };
  root.CQI18N_PACK_ES['ui:租金最低的一档'] = { body: 'Lo más barato de este piso' };
  root.CQI18N_PACK_ES['ui:租金中等'] = { body: 'Alquiler medio' };
  root.CQI18N_PACK_ES['ui:身体负担重'] = { body: 'Pesa en el cuerpo' };
  root.CQI18N_PACK_ES['ui:但晒、吵、孤单'] = { body: 'Pero sol, ruido y soledad' };
  root.CQI18N_PACK_ES['ui:电梯直达，腿不累'] = { body: 'Ascensor directo, las piernas descansan' };
  root.CQI18N_PACK_ES['ui:出门就是平路，不用爬楼'] = { body: 'Al salir, llano. Sin escaleras' };
  root.CQI18N_PACK_ES['ui:工作'] = { body: 'Trabajo' };
  root.CQI18N_PACK_ES['ui:住'] = { body: 'Casa' };
  root.CQI18N_PACK_ES['ui:净资产'] = { body: 'Patrimonio' };
  root.CQI18N_PACK_ES['ui:成就'] = { body: 'Logros' };
  root.CQI18N_PACK_ES['ui:返回'] = { body: 'Volver' };
  root.CQI18N_PACK_ES['ui:清空收集进度'] = { body: 'Borrar progreso' };
  root.CQI18N_PACK_ES['ui:确定清空所有收集进度？'] = { body: '¿Borrar todo el progreso?' };
  root.CQI18N_PACK_ES['ui:解锁了新的一页'] = { body: 'Se abrió una página nueva' };
  root.CQI18N_PACK_ES['ui:收集进度'] = { body: 'Progreso' };
  root.CQI18N_PACK_ES['ui:垂直层'] = { body: 'Alturas' };
  root.CQI18N_PACK_ES['ui:住过的高度'] = { body: 'Alturas vividas' };
  root.CQI18N_PACK_ES['ui:职业'] = { body: 'Oficios' };
  root.CQI18N_PACK_ES['ui:干过的活'] = { body: 'Trabajos hechos' };
  root.CQI18N_PACK_ES['ui:区县'] = { body: 'Distritos' };
  root.CQI18N_PACK_ES['ui:待过的地方'] = { body: 'Lugares vividos' };
  root.CQI18N_PACK_ES['ui:查看全部成就'] = { body: 'Ver todos los logros' };
  root.CQI18N_PACK_ES['ui:外部测试面板'] = { body: 'Panel de pruebas externas' };
  root.CQI18N_PACK_ES['ui:复制数据'] = { body: 'Copiar datos' };
  root.CQI18N_PACK_ES['ui:清空'] = { body: 'Limpiar' };
  root.CQI18N_PACK_ES['ui:刷新'] = { body: 'Actualizar' };
  root.CQI18N_PACK_ES['ui:活我自己的一生'] = { body: 'Vivir mi propia vida' };
  root.CQI18N_PACK_ES['ui:生于'] = { body: 'Nació' };
  root.CQI18N_PACK_ES['ui:死于'] = { body: 'Murió' };
  root.CQI18N_PACK_ES['ui:岁'] = { body: 'años' };
  root.CQI18N_PACK_ES['ui:万'] = { body: '10 mil' };
})(typeof window !== 'undefined' ? window : globalThis);
