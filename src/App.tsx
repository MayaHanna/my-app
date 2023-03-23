import {useEffect, useMemo, useState} from 'react';
import './App.css';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import DatePicker from 'react-date-picker';
import LRUCache from 'lru-cache';

interface Rate {
  value: number;
  date: string;
}

function App() {

  const [rates, setRates] = useState<Rate[]>([]);
  const [endDate, setEndDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();

  const cache = new LRUCache({ //Cache doesn't work
    max: 500 
  });

  const enableFetching = endDate && startDate && startDate < endDate && (endDate.getTime() - startDate.getTime()) <= 1000 * 60 * 60 * 24 * 14;

  async function fetchData(date: Date):Promise<Rate>{
    const dateAsISO = date.toISOString().split("T")[0];
    const valueFromCache = cache.get(dateAsISO); 
    if(valueFromCache){
      console.log(dateAsISO + " found in cache");
      return {value: valueFromCache as number, date: dateAsISO};
    }

    const rawData = await (await fetch(`https://openexchangerates.org/api/historical/${dateAsISO}.json?app_id=dc971481899445898f79d05116d52967`)).json();
    const rate: Rate = {value: rawData.rates["ILS"], date: dateAsISO};
    cache.set(rate.date, rate.value);
    console.log(dateAsISO + " saved in cache");
    return rate;
  }

  useEffect(()=>{   
    const currentDate = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(currentDate.getDate() - 14);
    setStartDate(twoWeeksAgo);
    setEndDate(currentDate);
  },[]);

  function getDatesInRange():Date[] {
    if(!startDate || !endDate) return [];

    let result = [];

    const date = new Date(startDate);
    let i = 0;
    while(date < endDate){
      date.setDate(startDate.getDate() + i);
      result.push(new Date(date));
      i++;
    }
    return result;
  }

  useEffect(()=>{   
    if(!enableFetching) return;
    const allData = Promise.all(getDatesInRange().map(d => fetchData(d)));
    allData.then((res) => setRates(res));
  },[startDate, endDate]);

  return (
    <div className="App">
      <div className='date-range'>
        <DatePicker value={startDate} onChange={setStartDate} />
        <h1> - </h1>
        <DatePicker value={endDate} onChange={setEndDate} />
      </div>
      {enableFetching &&
      <LineChart width={600} height={400} data={rates}>
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
        <XAxis dataKey="date" />
         <YAxis  domain={[Math.floor(Math.min(...rates.map(r=>r.value))), Math.ceil(Math.max(...rates.map(r=>r.value)))]}/>
         <Tooltip />
      </LineChart>}
    </div>
  );
}

export default App;
