<?php

/*
 * This file is part of Sulu.
 *
 * (c) MASSIVE ART WebServices GmbH
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.
 */

namespace Sulu\Bundle\CategoryBundle\Controller;

use FOS\RestBundle\Controller\Annotations\Get;
use FOS\RestBundle\Controller\Annotations\Post;
use FOS\RestBundle\Routing\ClassResourceInterface;
use Hateoas\Representation\CollectionRepresentation;
use Sulu\Bundle\CategoryBundle\Category\CategoryListRepresentation;
use Sulu\Bundle\CategoryBundle\Exception\CategoryIdNotFoundException;
use Sulu\Bundle\CategoryBundle\Exception\CategoryKeyNotUniqueException;
use Sulu\Component\Rest\Exception\MissingArgumentException;
use Sulu\Component\Rest\Exception\RestException;
use Sulu\Component\Rest\ListBuilder\Doctrine\DoctrineListBuilder;
use Sulu\Component\Rest\ListBuilder\Doctrine\DoctrineListBuilderFactory;
use Sulu\Component\Rest\ListBuilder\ListBuilderInterface;
use Sulu\Component\Rest\RequestParametersTrait;
use Sulu\Component\Rest\RestController;
use Sulu\Component\Rest\RestHelperInterface;
use Sulu\Component\Security\SecuredControllerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Makes categories available through a REST API.
 */
class CategoryController extends RestController implements ClassResourceInterface, SecuredControllerInterface
{
    use RequestParametersTrait;

    /**
     * {@inheritdoc}
     */
    protected static $entityKey = 'categories';

    /**
     * Returns the category which is assigned to the given id.
     *
     * @param $id
     * @param Request $request
     *
     * @return Response
     */
    public function getAction($id, Request $request)
    {
        $locale = $this->getRequestParameter($request, 'locale', true);
        $findCallback = function ($id) use ($locale) {
            $entity = $this->getCategoryManager()->findById($id);

            return $this->getCategoryManager()->getApiObject($entity, $locale);
        };

        $view = $this->responseGetById($id, $findCallback);

        return $this->handleView($view);
    }

    /**
     * Returns the sub-graph below the category which is assigned to the given parentId.
     * This method is used by the husky datagrid to load children of a category.
     * If request.flat is set, only the first level of the respective graph is returned in a flat format.
     *
     * @param Request $request
     * @param mixed $parentId
     *
     * @return Response
     *
     * @deprecated Will be removed in 2.0. Use the "parent" option on the cgetAction instead.
     */
    public function getChildrenAction($parentId, Request $request)
    {
        $locale = $this->getRequestParameter($request, 'locale', true);

        if ('true' == $request->get('flat')) {
            // check if parent exists
            $this->getCategoryManager()->findById($parentId);
            $list = $this->getListRepresentation($request, $locale, $parentId);
        } else {
            $entities = $this->getCategoryManager()->findChildrenByParentId($parentId);
            $categories = $this->getCategoryManager()->getApiObjects($entities, $locale);
            $list = new CollectionRepresentation($categories, self::$entityKey);
        }

        return $this->handleView($this->view($list, 200));
    }

    /**
     * Returns the whole category graph.
     * If request.rootKey is set, only the sub-graph below the category which is assigned to the given key is returned.
     * If request.flat is set, only the first level of the respective graph is returned in a flat format.
     * If request.expand is set, the paths to the respective categories are expanded.
     *
     * @param Request $request
     *
     * @return Response
     */
    public function cgetAction(Request $request)
    {
        $locale = $this->getRequestParameter($request, 'locale', true);
        $rootKey = $request->get('rootKey');
        $parentId = $request->get('parentId');

        if ('true' == $request->get('flat')) {
            $rootId = ($rootKey) ? $this->getCategoryManager()->findByKey($rootKey)->getId() : null;
            $expandedIds = array_filter(explode(',', $request->get('expandedIds', $request->get('selectedIds'))));
            $list = $this->getListRepresentation(
                $request,
                $locale,
                $parentId ?? $rootId,
                $expandedIds,
                $request->query->has('expandedIds')
            );
        } elseif ($request->query->has('ids')) {
            $entities = $this->getCategoryManager()->findByIds(explode(',', $request->query->get('ids')));
            $categories = $this->getCategoryManager()->getApiObjects($entities, $locale);
            $list = new CollectionRepresentation($categories, self::$entityKey);
        } else {
            $entities = $this->getCategoryManager()->findChildrenByParentKey($rootKey);
            $categories = $this->getCategoryManager()->getApiObjects($entities, $locale);
            $list = new CollectionRepresentation($categories, self::$entityKey);
        }

        return $this->handleView($this->view($list, 200));
    }

    /**
     * Trigger an action for given category. Action is specified over get-action parameter.
     *
     * @Post("categories/{id}")
     *
     * @param int $id
     * @param Request $request
     *
     * @return Response
     */
    public function postTriggerAction($id, Request $request)
    {
        $action = $this->getRequestParameter($request, 'action', true);

        try {
            switch ($action) {
                case 'move':
                    return $this->move($id, $request);
                    break;
                default:
                    throw new RestException(sprintf('Unrecognized action: "%s"', $action));
            }
        } catch (RestException $ex) {
            $view = $this->view($ex->toArray(), 400);

            return $this->handleView($view);
        }
    }

    /**
     * Moves category - identified by id.
     *
     * @param int $id
     * @param Request $request
     *
     * @return Response
     */
    private function move($id, Request $request)
    {
        $parentId = $this->getRequestParameter($request, 'parentId', true);
        if ('null' === $parentId) {
            $parentId = null;
        }

        $categoryManager = $this->getCategoryManager();
        $category = $categoryManager->move($id, $parentId);

        return $this->handleView($this->view($categoryManager->getApiObject($category, $request->get('locale'))));
    }

    /**
     * Adds a new category.
     *
     * @param Request $request
     *
     * @return Response
     */
    public function postAction(Request $request)
    {
        return $this->saveCategory($request);
    }

    /**
     * Updates the category which is assigned to the given id.
     * Properties which are not set in the request will be removed from the category.
     *
     * @param $id
     * @param Request $request
     *
     * @return Response
     */
    public function putAction($id, Request $request)
    {
        return $this->saveCategory($request, $id);
    }

    /**
     * Partly updates the category which is assigned to the given id.
     * Properties which are not set in the request will not be changed.
     *
     * @param $id
     * @param Request $request
     *
     * @return Response
     */
    public function patchAction(Request $request, $id)
    {
        return $this->saveCategory($request, $id, true);
    }

    /**
     * Deletes the category which is assigned to the given id.
     *
     * @param $id
     *
     * @return Response
     */
    public function deleteAction($id)
    {
        $deleteCallback = function ($id) {
            $this->getCategoryManager()->delete($id);
        };

        $view = $this->responseDelete($id, $deleteCallback);

        return $this->handleView($view);
    }

    /**
     * Creates or updates a category based on the request.
     * If id is set, the category which is assigned to the given id is overwritten.
     * If patch is set, the category which is assigned to the given id is updated partially.
     *
     * @param Request $request
     * @param null $id
     * @param bool $patch
     *
     * @return Response
     *
     * @throws CategoryIdNotFoundException
     * @throws CategoryKeyNotUniqueException
     * @throws MissingArgumentException
     */
    protected function saveCategory(Request $request, $id = null, $patch = false)
    {
        $mediasData = $request->get('medias');
        $medias = null;
        if ($mediasData && array_key_exists('ids', $mediasData)) {
            $medias = $mediasData['ids'];
        }

        $locale = $this->getRequestParameter($request, 'locale', true);
        $data = [
            'id' => $id,
            'name' => (empty($request->get('name'))) ? null : $request->get('name'),
            'description' => (empty($request->get('description'))) ? null : $request->get('description'),
            'medias' => $medias,
            'key' => (empty($request->get('key'))) ? null : $request->get('key'),
            'meta' => $request->get('meta'),
            'parent' => $request->get('parentId'),
        ];
        $entity = $this->getCategoryManager()->save($data, null, $locale, $patch);
        $category = $this->getCategoryManager()->getApiObject($entity, $locale);

        return $this->handleView($this->view($category, 200));
    }

    /**
     * Returns a category-list-representation for the category graph respective to the request.
     * The category-list-representation contains only the root level of the category graph.
     *
     * If parentId is set, the root level of the sub-graph below the category with the given parentId is returned.
     * If expandedIds is set, the paths to the categories which are assigned to the ids are expanded.
     *
     * @param Request $request
     * @param $locale
     * @param null $parentId
     * @param array $expandedIds
     *
     * @return CategoryListRepresentation
     */
    protected function getListRepresentation(
        Request $request,
        $locale,
        $parentId = null,
        $expandedIds = [],
        $expandSelf = false
    ) {
        $listBuilder = $this->initializeListBuilder($locale);

        // disable pagination to simplify tree handling
        $listBuilder->limit(null);

        // collect categories which children should get loaded
        $idsToExpand = [$parentId];
        if ($expandedIds) {
            $pathIds = $this->get('sulu.repository.category')->findCategoryIdsBetween([$parentId], $expandedIds);
            $idsToExpand = array_merge($idsToExpand, $pathIds);
            if ($expandSelf) {
                $idsToExpand = array_merge($idsToExpand, $expandedIds);
            }
        }

        if ('csv' === $request->getRequestFormat()) {
            $idsToExpand = array_filter($idsToExpand);
        }

        // generate expressions for collected parent-categories
        $parentExpressions = [];
        foreach ($idsToExpand as $idToExpand) {
            $parentExpressions[] = $listBuilder->createWhereExpression(
                $listBuilder->getFieldDescriptor('parent'),
                $idToExpand,
                ListBuilderInterface::WHERE_COMPARATOR_EQUAL
            );
        }

        if (!$request->get('search')) {
            // expand collected parents if search is not set
            if (count($parentExpressions) >= 2) {
                $listBuilder->addExpression($listBuilder->createOrExpression($parentExpressions));
            } elseif (count($parentExpressions) >= 1) {
                $listBuilder->addExpression($parentExpressions[0]);
            }
        } elseif ($request->get('search') && $parentId && !$expandedIds) {
            // filter for parentId when search is active and no expandedIds are set
            $listBuilder->addExpression($parentExpressions[0]);
        }

        $categories = $listBuilder->execute();

        foreach ($categories as &$category) {
            $category['hasChildren'] = ($category['lft'] + 1) !== $category['rgt'];
        }

        if (!empty($expandedIds)) {
            $categoriesByParentId = [];
            foreach ($categories as &$category) {
                $categoryParentId = $category['parent'];
                if (!isset($categoriesByParentId[$categoryParentId])) {
                    $categoriesByParentId[$categoryParentId] = [];
                }
                $categoriesByParentId[$categoryParentId][] = &$category;
            }

            foreach ($categories as &$category) {
                if (!isset($categoriesByParentId[$category['id']])) {
                    continue;
                }

                $category['_embedded'] = [
                    self::$entityKey => $categoriesByParentId[$category['id']],
                ];
            }

            $categories = $categoriesByParentId[$parentId];
        }

        return new CategoryListRepresentation(
            $categories,
            self::$entityKey,
            'get_categories',
            $request->query->all(),
            $listBuilder->getCurrentPage(),
            $listBuilder->getLimit(),
            $listBuilder->count()
        );
    }

    /**
     * Initializes and returns a ListBuilder instance which is used when returning a CategoryListRepresentation
     * for the given locale. The returned ListBuilder is initialized with the request-parameters and respective
     * select fields.
     *
     * @param $locale
     *
     * @return DoctrineListBuilder
     */
    private function initializeListBuilder($locale)
    {
        /** @var RestHelperInterface $restHelper */
        $restHelper = $this->get('sulu_core.doctrine_rest_helper');

        /** @var DoctrineListBuilderFactory $factory */
        $factory = $this->get('sulu_core.doctrine_list_builder_factory');

        $fieldDescriptors = $this->getFieldDescriptors($locale);

        $listBuilder = $factory->create($this->getParameter('sulu.model.category.class'));
        // sort by depth before initializing listbuilder with request parameter to avoid wrong sorting in frontend
        $listBuilder->sort($fieldDescriptors['depth']);
        $restHelper->initializeListBuilder($listBuilder, $fieldDescriptors);

        $listBuilder->addSelectField($fieldDescriptors['depth']);
        $listBuilder->addSelectField($fieldDescriptors['parent']);
        $listBuilder->addSelectField($fieldDescriptors['locale']);
        $listBuilder->addSelectField($fieldDescriptors['defaultLocale']);
        $listBuilder->addSelectField($fieldDescriptors['lft']);
        $listBuilder->addSelectField($fieldDescriptors['rgt']);

        return $listBuilder;
    }

    /**
     * {@inheritdoc}
     */
    public function getSecurityContext()
    {
        return 'sulu.settings.categories';
    }

    /**
     * Returns the CategoryManager.
     *
     * @return \Sulu\Bundle\CategoryBundle\Category\CategoryManagerInterface
     */
    private function getCategoryManager()
    {
        return $this->get('sulu_category.category_manager');
    }

    private function getFieldDescriptors($locale)
    {
        return $this->get('sulu_core.list_builder.field_descriptor_factory')
            ->getFieldDescriptorForClass(
                $this->getParameter('sulu.model.category.class'),
                ['locale' => $locale]
            );
    }
}
