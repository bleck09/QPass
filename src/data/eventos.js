// --- CATÁLOGO COMPARTIDO DE EVENTOS (home pública y panel privado del Usuario Normal) ---
// `fecha` es el texto lindo para mostrar; `fechaISO` es la fecha real para poder comparar
// (new Date() no interpreta de forma confiable abreviaturas de mes en español como "Dic" o "Ago").
export const proximosEventos = [
  { id: 'ev-01', nombre: 'Festival QPass 2026', fecha: '15 Oct, 2026', fechaISO: '2026-10-15', lugar: 'Campo Ferial, Cbba', imagen: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Concierto', precio: 'Bs. 150' },
  { id: 'ev-02', nombre: 'Tech Summit Latam', fecha: '20 Nov, 2026', fechaISO: '2026-11-20', lugar: 'Hotel Cochabamba', imagen: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Tecnología', precio: 'Bs. 300' },
  { id: 'ev-03', nombre: 'Feria Gastronómica', fecha: '02 Nov, 2026', fechaISO: '2026-11-02', lugar: 'Parque de la Familia', imagen: 'https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Gastronomía', precio: 'Bs. 50' },
  { id: 'ev-04', nombre: 'Fiesta de Año Nuevo', fecha: '31 Dic, 2026', fechaISO: '2026-12-31', lugar: 'Salón El Portal', imagen: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Fiesta', precio: 'Bs. 250' },
  { id: 'ev-05', nombre: 'Carnaval VIP', fecha: '15 Feb, 2027', fechaISO: '2027-02-15', lugar: 'Santa Cruz', imagen: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', categoria: 'Festival', precio: 'Bs. 400' },
];

export const eventosPasados = [
  { id: 'ev-pas-01', nombre: 'Oktoberfest 2025', fecha: 'Octubre 2025', lugar: 'Santa Cruz', imagen: 'https://images.unsplash.com/photo-1575037614876-c38db4ce8445?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
  { id: 'ev-pas-02', nombre: 'Expo Valles', fecha: 'Agosto 2025', lugar: 'Tarija', imagen: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
];
