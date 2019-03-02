import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost';
import gql from 'graphql-tag';

import { getAccessToken, isLoggedIn } from './auth';

const endpointURL = 'http://localhost:9000/graphql';

const authLink = new ApolloLink((operation, forward) => {
  if(isLoggedIn()) {
    operation.setContext({
      headers: {
        'authorization': 'Bearer ' + getAccessToken()
      }
    });
  }
  return forward(operation);
});

const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,
    new HttpLink({uri: endpointURL})
  ]),
  cache: new InMemoryCache()
});

const jobDetailFragment = gql`
  fragment JobDetail on Job {
    id
    title
    description
    company {
      id
      name
    }
  }
`;

const companyQuery = gql`
  query CompanyQuery($id: ID!) {
    company(id: $id) {
      id
      name
      description
      jobs {
        id
        title
      }
    }
  }
`;

const jobQuery = gql`
  query JobQuery($id: ID!) {
    job(id: $id) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

const jobsQuery = gql`
  query JobsQuery {
    jobs {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

export async function loadJobs() {
  const {data: {jobs}} = await client.query({query: jobsQuery, fetchPolicy: 'no-cache'})
  return jobs;
}


const createJobMutation = gql`
  mutation CreateJob($input: CreateJobInput){
    job: createJob(input: $input) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

export async function createJob(input) {
  const {data: {job}} = await client.mutate({
    mutation: createJobMutation,
    variables: {input},
    update: (cache, {data}) => {
      cache.writeQuery({
        query: jobQuery,
        variables: {id: data.job.id},
        data
      })
    }
  })
  return job;
}

export async function getJob(id) {
  const {data: {job}} = await client.query({query: jobQuery, variables: {id}})
  return job;
}

export async function getCompany(id) {
  const {data: {company}} = await client.query({
    query: companyQuery,
    variables: {id}
  })
  return company;
}