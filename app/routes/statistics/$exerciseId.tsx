import type {LoaderFunction} from "remix";
import {json, useCatch, useLoaderData} from "remix";
import type {Set} from "~/models/set.server";
import invariant from "tiny-invariant";
import {Exercise, getExercise,} from "~/models/exercise.server";
import type {Series} from "~/models/series.server";
import {requireUserId} from "~/session.server";
import Line, {GraphData} from "~/components/LineChart";

type LoaderData = {
    exercise: Exercise & {
        set: (Set & {
            series: Series[];
            workout: {
                date: Date;
            };
        })[];
    };
    graphData: GraphData
};

export const loader: LoaderFunction = async ({request, params}) => {
    const userId = await requireUserId(request);
    invariant(params.exerciseId, "exerciseId not found");

    const ex = await getExercise({userId, id: params.exerciseId});

    if (!ex) {
        throw new Response("Not Found", {status: 404});
    }
    let data = ex.set.reduceRight((acc, s) => {
        let totalVolume = 0;
        for (const series of s.series) {
            totalVolume += series.weigth * series.repetitions;
        }
        if (s.series.length > 0) acc.push({
            date: s.workout.date,
            volume: totalVolume
        })
        return acc;
    }, [] as Array<any>)
    let graphData: GraphData = [{label: ex.title, data}]
    return json<LoaderData>({exercise: ex, graphData});
};

export default function StatisticsDetailsPage() {
    const data = useLoaderData() as LoaderData;

    return (
        <div className="h-[400px]">
            <h1 className="text-center text-2xl font-bold">{data.exercise.title}</h1>
            {data.graphData[0].data.length > 0 ? <Line data={data.graphData}/> : "No data"}
        </div>
    );
}

export function ErrorBoundary({error}: { error: Error }) {
    console.error(error);

    return <div>An unexpected error occurred: {error.message}</div>;
}

export function CatchBoundary() {
    const caught = useCatch();

    if (caught.status === 404) {
        return <div>Note not found</div>;
    }

    throw new Error(`Unexpected caught response with status: ${caught.status}`);
}
